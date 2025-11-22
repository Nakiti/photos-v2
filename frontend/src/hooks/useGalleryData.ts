import { useDatabase } from '@nozbe/watermelondb/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import Gallery from '../db/models/Gallery';
import { deleteGallery, fetchMyGalleries, updateGallery } from '../services/api/gallery.service';
import { uploadNewGalleryIcon } from '../services/api/gallery.service';
import { syncGalleries, syncGalleryDetails } from '../services/sync/gallery.sync';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGallery, getGalleryDetails } from '../services/api/gallery.service';
import { UpdateGalleryRequest } from '../types/gallery.types';
import { Photo as PhotoApi} from '../types';
import { fetchPhotoIdsForSync, fetchPhotos } from '../services/api/photos.service';
import { switchMap } from '@nozbe/watermelondb/utils/rx';
import { of } from '@nozbe/watermelondb/utils/rx';
import { syncPhotos, reconcileDeletedPhotos } from '../services/sync/photos.sync';
import Photo from '../db/models/Photo';
import { CreateGalleryRequest } from '../services/api/gallery.service';

/**
 * A custom hook to get a live-updating list of galleries of a specific type.
 * It provides data from the local DB for an instant UI, and fetches fresh
 * data from the server in the background to keep it up to date.
 *
 * @param type - The type of galleries to fetch ('GROUP' or 'EVENT').
 * @param searchQuery - Optional search term to filter galleries by name (case-insensitive partial match).
 */
export const useGalleries = (type: 'GROUP' | 'EVENT', searchQuery?: string) => {
  const database = useDatabase();
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  // 1. OBSERVE LOCAL DATA:

  useEffect(() => {
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    
    // Build query conditions
    const conditions = [Q.where('type', type)];
    
    // Add search filter if searchQuery is provided
    if (searchQuery && searchQuery.trim() !== '') {
      const sanitizedQuery = Q.sanitizeLikeString(searchQuery.trim());
      conditions.push(Q.where('name', Q.like(`%${sanitizedQuery}%`)));
    }
    
    const query = galleriesCollection.query(...conditions);
    const subscription = query.observe().subscribe(setGalleries);

    return () => subscription.unsubscribe();
  }, [database, type, searchQuery]);


  // 2. FETCH & SYNC REMOTE DATA:
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['galleries', type], // A unique key for this query
    queryFn: async () => {
      const remoteGalleries = await fetchMyGalleries();
      await syncGalleries(database, remoteGalleries);

      return remoteGalleries;
    },
    refetchOnWindowFocus: true,
  });


  // 3. RETURN VALUES:
  return {
    galleries, 
    isLoading: isLoading && galleries.length === 0, 
    isSyncing: isFetching, 
    isError,
    error,
  };
};

/**
 * Hook to get a live, observable record for a *single* gallery AND its photos.
 * It provides local data instantly, then syncs with the server in the background.
 *
 * @param galleryId The ID of the gallery to fetch.
 */
export const useGallery = (galleryId: string | null) => {
  const database = useDatabase();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    if (!galleryId) {
      setGallery(null);
      setPhotos([]);
      return;
    }

    const galleryCollection = database.collections.get<Gallery>('galleries');
    const galleryObservable = galleryCollection.findAndObserve(galleryId);

    const gallerySubscription = galleryObservable.subscribe(setGallery);

    const photosSubscription = galleryObservable
      .pipe(
        switchMap(g =>
          g ? g.photos.observe(Q.sortBy('created_at', Q.desc)) : of([])
        )
      )
      .subscribe((list) => {
        setPhotos(list as unknown as Photo[]);
        console.log(`[Local][Gallery ${galleryId}] observed ${(list as any).length} photos`);
      });

    return () => {
      gallerySubscription.unsubscribe();
      photosSubscription.unsubscribe();
    };
  }, [database, galleryId]);


  // 2. FETCH & SYNC REMOTE DATA ("Inbox" and "Deletion" Sync)
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['gallery', galleryId], 
    queryFn: async () => {
      if (!galleryId) return null;

      const photosCollection = database.collections.get<Photo>('photos');
      const latestLocalPhoto = await photosCollection.query(
        Q.where('gallery_id', galleryId),
        Q.where('status', 'synced'), 
        Q.sortBy('created_at', Q.desc),
        Q.take(1)
      ).fetch();
      
      const lastSyncedTimestamp = latestLocalPhoto[0]?.createdAt;
      console.log(`[Local][Gallery ${galleryId}] lastSynced=${lastSyncedTimestamp ?? 'none'}`);

      // 2. Fetch all data from the server
      const [remoteDetails, newPhotos, remotePhotoIds] = await Promise.all([
        getGalleryDetails(galleryId),
        fetchPhotos(galleryId, lastSyncedTimestamp),
        fetchPhotoIdsForSync(galleryId)
      ]);

      console.log(
        `[Cloud][Gallery ${galleryId}] fetched photos=${newPhotos.length} idsForSync=${remotePhotoIds.length}`
      );

      // 3. Sync gallery details
      await syncGalleryDetails(database, remoteDetails);
      
      // 4. Sync the new photos
      await syncPhotos(database, newPhotos);

      // 5. Reconcile deletions
      await reconcileDeletedPhotos(database, galleryId, remotePhotoIds);

      return remoteDetails;
    },
    enabled: !!galleryId,
    refetchOnWindowFocus: true, 
    staleTime: 60 * 1000, 
  });

  return {
    gallery, 
    photos,  
    isLoading: isLoading && !gallery,
    isSyncing: isFetching,
    isError,
    error,
  };
};

interface CreateGalleryWithIconParams {
  galleryData: CreateGalleryRequest;
  imageUri: string | null;
}

export const useCreateGallery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ galleryData, imageUri }: CreateGalleryWithIconParams) => {
      
      if (!imageUri) {
        // --- Flow 1: No icon selected ---
        const { gallery } = await createGallery(galleryData);
        return gallery;
      }

      // --- Flow 2: Icon is selected ---
      const { gallery, uploadInfo } = await createGallery({
        ...galleryData,
        wantsIconUpload: true, 
      });

      if (!uploadInfo) {
        // This should never happen if wantsIconUpload is true
        throw new Error('Server did not return upload info.');
      }

      // 2. Get the image blob from the device
      const imageFetchResponse = await fetch(imageUri);
      const blob = await imageFetchResponse.blob();
      const imageType = blob.type || 'image/jpeg';

      // 3. Upload the image directly to S3
      const s3UploadResponse = await fetch(uploadInfo.presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': imageType,
        },
      });

      if (!s3UploadResponse.ok) {
        throw new Error('Failed to upload image to S3.');
      }

      // 4. Success! Return the new gallery.
      return {
        ...gallery,
        iconUrl: uploadInfo.finalUrl,
      };
    },

    onSuccess: (newGallery) => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });

      queryClient.setQueryData(['gallery', newGallery.id], newGallery);
    },

    onError: (error) => {
      console.error('Failed to create gallery:', error);
    },
  });
};

export const useUpdateGallery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ galleryId, data }: { galleryId: string; data: UpdateGalleryRequest }) => updateGallery(galleryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
  });
};

export const useDeleteGallery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (galleryId: string) => deleteGallery(galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
  });
};

/**
 * Hook to provide a mutation for updating the gallery's icon.
 */
export const useUpdateGalleryIcon = (galleryId: string | null) => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!galleryId) throw new Error('galleryId is required');
      return uploadNewGalleryIcon(galleryId, imageUri);
    },
    onSuccess: async (updatedGallery) => {
      await syncGalleryDetails(database, updatedGallery);
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId || ''] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
    onError: (error) => {
      console.error('Failed to update gallery icon:', error);
    },
  });
};