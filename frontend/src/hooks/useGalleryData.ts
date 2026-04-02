import { useDatabase } from '@nozbe/watermelondb/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Q, Database } from '@nozbe/watermelondb';
import Gallery from '../db/models/Gallery';
import { deleteGallery, fetchMyGalleries, updateGallery, transferGalleryOwnership } from '../services/api/gallery.service';
import { uploadNewGalleryIcon } from '../services/api/gallery.service';
import { syncGalleries, syncGalleryDetails } from '../services/sync/gallery.sync';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGallery, getGalleryDetails } from '../services/api/gallery.service';
import { UpdateGalleryRequest } from '../types/gallery.types';
import { fetchPhotoIdsForSync, fetchPhotos, fetchDeletedPhotoIds } from '../services/api/photos.service';
import { getRateLimitState } from '../services/api/gallery.service';
import { syncPhotos, reconcileDeletedPhotos, reconcileDeletedPhotosSince } from '../services/sync/photos.sync';
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
export const useGalleries = (
  type?: 'GROUP' | 'EVENT',
  searchQuery?: string
) => {
  const database = useDatabase();
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  // 1. OBSERVE LOCAL DATA:

  useEffect(() => {
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    
    // Build query conditions
    const conditions: any[] = [];
    if (type) {
      conditions.push(Q.where('type', type));
    }
    
    // Add search filter if searchQuery is provided
    if (searchQuery && searchQuery.trim() !== '') {
      const sanitizedQuery = Q.sanitizeLikeString(searchQuery.trim());
      conditions.push(Q.where('name', Q.like(`%${sanitizedQuery}%`)));
    }
    
    const query = galleriesCollection.query(
      ...conditions,
      Q.sortBy('last_photo_at', Q.desc),
      Q.sortBy('created_at', Q.desc)
    );
    const subscription = query.observe().subscribe((galleriesList) => {
      const sorted = [...galleriesList].sort((a, b) => {
        const aTime = a.lastPhotoAt ?? 0;
        const bTime = b.lastPhotoAt ?? 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      setGalleries(sorted);
    });

    return () => subscription.unsubscribe();
  }, [database, type, searchQuery]);


  // 2. FETCH & SYNC REMOTE DATA:
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['galleries', type], // If type is undefined, works for all
    queryFn: async () => {
      const remoteGalleries = await fetchMyGalleries();
      await syncGalleries(database, remoteGalleries);

      return remoteGalleries;
    },
    refetchOnWindowFocus: true,
    // Don't retry on network errors - we have local data to show
    retry: false,
    // Don't retry when component remounts if we already have local data
    retryOnMount: false,
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
 * Local-only hook: observes a single gallery + its photos from WatermelonDB without
 * triggering any server sync queries. Use this in screens (e.g. SingleImageScreen)
 * that are mounted on top of a screen already running useGallery, so we don't
 * spawn a second set of network requests.
 */
export const useLocalGallery = (
  galleryId: string | null,
  options?: { tagId?: string | null; uploaderId?: string | null },
) => {
  const database = useDatabase();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const selectedTagId = options?.tagId ?? null;
  const selectedUploaderId = options?.uploaderId ?? null;

  useEffect(() => {
    if (!galleryId) {
      setGallery(null);
      setPhotos([]);
      return;
    }

    const galleryCollection = database.collections.get<Gallery>('galleries');
    const gallerySub = galleryCollection.findAndObserve(galleryId).subscribe(setGallery);

    const photosCollection = database.collections.get<Photo>('photos');
    const conditions = [Q.where('gallery_id', galleryId)] as any[];
    if (selectedTagId) conditions.push(Q.on('photo_tags', 'tag_id', selectedTagId));
    if (selectedUploaderId) conditions.push(Q.where('uploader_id', selectedUploaderId));

    const photosSub = photosCollection
      .query(...conditions, Q.sortBy('created_at', Q.desc))
      .observe()
      .subscribe((list) => setPhotos(list as unknown as Photo[]));

    return () => {
      gallerySub.unsubscribe();
      photosSub.unsubscribe();
    };
  }, [database, galleryId, selectedTagId, selectedUploaderId]);

  return { gallery, photos };
};

// Module-level cache: survives component re-mounts within the same app session.
// Keyed by galleryId → timestamp of last successful deletion reconciliation (ms).
// Avoids re-running the expensive full-ID fetch on every gallery navigation.
const reconciliationCache = new Map<string, number>();

/**
 * Hook to get a live, observable record for a *single* gallery AND its photos.
 * It provides local data instantly, then syncs with the server in the background.
 *
 * Two queries run independently:
 *   - ['gallery', galleryId, 'meta']  — gallery details + rate limit (slow-changing)
 *   - ['gallery', galleryId, 'photos'] — photo sync + deletion reconciliation (fast-changing)
 *
 * Socket events only invalidate the photos query, keeping metadata fetches rare.
 *
 * @param galleryId The ID of the gallery to fetch.
 */
export const useGallery = (galleryId: string | null, options?: { tagId?: string | null; uploaderId?: string | null }) => {
  const database = useDatabase();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const selectedTagId = options?.tagId ?? null;
  const selectedUploaderId = options?.uploaderId ?? null;

  // 1. OBSERVE LOCAL DATA
  useEffect(() => {
    if (!galleryId) {
      setGallery(null);
      setPhotos([]);
      return;
    }

    const galleryCollection = database.collections.get<Gallery>('galleries');
    const gallerySubscription = galleryCollection.findAndObserve(galleryId).subscribe(setGallery);

    const photosCollection = database.collections.get<Photo>('photos');
    const conditions = [Q.where('gallery_id', galleryId)] as any[];
    if (selectedTagId) {
      conditions.push(Q.on('photo_tags', 'tag_id', selectedTagId));
    }
    if (selectedUploaderId) {
      conditions.push(Q.where('uploader_id', selectedUploaderId));
    }
    const photosSubscription = photosCollection
      .query(...conditions, Q.sortBy('created_at', Q.desc))
      .observe()
      .subscribe((list) => {
        setPhotos(list as unknown as Photo[]);
      });

    return () => {
      gallerySubscription.unsubscribe();
      photosSubscription.unsubscribe();
    };
  }, [database, galleryId, selectedTagId, selectedUploaderId]);

  // 2. GALLERY META QUERY — details + rate limit
  // Invalidated by: gallery_updated socket events, window focus, reconnect.
  // Not invalidated by new_photo events, keeping this fetch rare.
  const metaQuery = useQuery({
    queryKey: ['gallery', galleryId, 'meta'],
    queryFn: async () => {
      if (!galleryId) return null;

      const [remoteDetails, rateLimitState] = await Promise.all([
        getGalleryDetails(galleryId),
        getRateLimitState(galleryId).catch(() => null),
      ]);

      const galleryWithRateLimit = rateLimitState
        ? {
            ...remoteDetails,
            uploadLimitPerHour: rateLimitState.uploadLimitPerHour,
            rateLimitStateToken: rateLimitState.stateToken,
            rateLimitLastSynced: Date.now(),
          }
        : remoteDetails;
      await syncGalleryDetails(database, galleryWithRateLimit);

      return remoteDetails;
    },
    enabled: !!galleryId,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // gallery meta changes infrequently
    retry: false,
    retryOnMount: false,
  });

  // 3. PHOTO SYNC QUERY — new photos + deletion reconciliation
  // Invalidated by: new_photo socket events, reconnect, window focus.
  const photosQuery = useQuery({
    queryKey: ['gallery', galleryId, 'photos'],
    queryFn: async () => {
      if (!galleryId) return null;

      const photosCollection = database.collections.get<Photo>('photos');
      const latestLocalPhoto = await photosCollection
        .query(
          Q.where('gallery_id', galleryId),
          Q.where('status', 'synced'),
          Q.sortBy('created_at', Q.desc),
          Q.take(1),
        )
        .fetch();

      const lastSyncedTimestamp = latestLocalPhoto[0]?.createdAt;

      // Subtract a 5-second overlap buffer so near-simultaneous uploads whose
      // server createdAt is slightly earlier than the cursor are never missed.
      // syncPhotos handles duplicates idempotently so re-fetching a few photos is harmless.
      const since = lastSyncedTimestamp ? lastSyncedTimestamp - 5000 : undefined;

      const lastReconciledAt = reconciliationCache.get(galleryId) ?? 0;
      const needsReconciliation = lastReconciledAt === 0;
      const isDeltaReconciliation = !needsReconciliation;

      const [newPhotos, reconciliationData] = await Promise.all([
        fetchPhotos(galleryId, since),
        needsReconciliation
          ? fetchPhotoIdsForSync(galleryId)
          : fetchDeletedPhotoIds(galleryId, lastReconciledAt),
      ]);

      console.log(
        `[Cloud][Gallery ${galleryId}] photos=${newPhotos.length} reconcile=${needsReconciliation} delta=${isDeltaReconciliation}`,
      );

      await syncPhotos(database, newPhotos);

      const now = Date.now();
      if (needsReconciliation) {
        await reconcileDeletedPhotos(database, galleryId, reconciliationData as string[]);
      } else {
        await reconcileDeletedPhotosSince(database, galleryId, reconciliationData as string[]);
      }
      reconciliationCache.set(galleryId, now);

      return newPhotos.length;
    },
    enabled: !!galleryId,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    retry: false,
    retryOnMount: false,
  });

  return {
    gallery,
    photos,
    isLoading: (metaQuery.isLoading && !gallery) || (photosQuery.isLoading && photos.length === 0),
    isSyncing: metaQuery.isFetching || photosQuery.isFetching,
    isError: metaQuery.isError || photosQuery.isError,
    error: metaQuery.error ?? photosQuery.error,
  };
};

interface CreateGalleryWithIconParams {
  galleryData: CreateGalleryRequest;
  imageUri: string | null;
}

export const useCreateGallery = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: async ({ galleryData, imageUri }: CreateGalleryWithIconParams) => {
      
      if (!imageUri) {
        // --- Flow 1: No icon selected ---
        const result = (await createGallery(galleryData as any)) as any;
        // Server may return either `{ gallery }` or the gallery object directly.
        return result?.gallery ?? result;
      }

      // --- Flow 2: Icon is selected ---
      const result = (await createGallery({
        ...(galleryData as any),
        wantsIconUpload: true,
      } as any)) as any;

      if (!result?.uploadInfo) {
        // This should never happen if wantsIconUpload is true
        throw new Error('Server did not return upload info.');
      }

      const { gallery, uploadInfo } = result as any;

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

    onSuccess: async (newGallery) => {
      await syncGalleryDetails(database, newGallery as any);
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
  const database = useDatabase();

  return useMutation({
    mutationFn: ({ galleryId, data }: { galleryId: string; data: UpdateGalleryRequest }) => updateGallery(galleryId, data),
    onSuccess: async (updatedGallery, { galleryId }) => {
      // Keep local WatermelonDB in sync so screens that render from local (e.g. GalleryDetails)
      // update immediately after the user saves changes.
      await syncGalleryDetails(database, updatedGallery as any);
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId, 'meta'] });
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

export const useTransferGalleryOwnership = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: ({ galleryId, newOwnerId }: { galleryId: string; newOwnerId: string }) =>
      transferGalleryOwnership(galleryId, newOwnerId),
    onSuccess: async (updatedGallery, { galleryId }) => {
      await syncGalleryDetails(database, updatedGallery);
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId, 'meta'] });
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
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

/**
 * Utility function to dump all galleries from the local database.
 * Useful for debugging offline scenarios.
 */
export const dumpLocalGalleries = async (database: Database) => {
  try {
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    const allGalleries = await galleriesCollection.query().fetch();
    
    console.log('=== COMPLETE LOCAL GALLERIES DUMP ===');
    console.log(`Total galleries in local DB: ${allGalleries.length}`);
    console.log('');
    
    for (const gallery of allGalleries) {
      const galleryData = {
        id: gallery.id,
        name: gallery.name,
        type: gallery.type,
        ownerId: gallery.ownerId,
        communityId: gallery.communityId,
        communityName: gallery.communityName,
        iconUrl: gallery.iconUrl,
        startDate: gallery.startDate,
        endDate: gallery.endDate,
        location: gallery.location,
        shareableLink: gallery.shareableLink,
        joinRequiresApproval: gallery.joinRequiresApproval,
        addPermission: gallery.addPermission,
        deletePermission: gallery.deletePermission,
        createdAt: gallery.createdAt,
        updatedAt: gallery.updatedAt,
      };
      console.log(`Gallery [${gallery.id}]:`, JSON.stringify(galleryData, null, 2));
      console.log('---');
    }
    
    console.log('=== END COMPLETE DUMP ===');
    return allGalleries;
  } catch (error) {
    console.error('Error dumping local galleries:', error);
    throw error;
  }
};