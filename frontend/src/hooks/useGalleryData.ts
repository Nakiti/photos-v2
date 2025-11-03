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

/**
 * A custom hook to get a live-updating list of galleries of a specific type.
 * It provides data from the local DB for an instant UI, and fetches fresh
 * data from the server in the background to keep it up to date.
 *
 * @param type - The type of galleries to fetch ('GROUP' or 'EVENT').
 */
export const useGalleries = (type: 'GROUP' | 'EVENT') => {
  const database = useDatabase();
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  // 1. OBSERVE LOCAL DATA:

  useEffect(() => {
    const galleriesCollection = database.collections.get<Gallery>('galleries');
    // Create a query for galleries of the specified type
    const query = galleriesCollection.query(Q.where('type', type));

    // Observe the query for changes
    const subscription = query.observe().subscribe(setGalleries);

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, [database, type]);



  // 2. FETCH & SYNC REMOTE DATA:
  // This useQuery hook from TanStack Query handles fetching data from the
  // server and syncing it to the local database.
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['galleries', type], // A unique key for this query
    queryFn: async () => {
      // Fetch the latest list of all galleries from the server
      const remoteGalleries = await fetchMyGalleries();
      // Sync the fetched data with our local WatermelonDB
      await syncGalleries(database, remoteGalleries);
      return remoteGalleries;
    },
    refetchOnWindowFocus: true,
  });


  // 3. RETURN VALUES:
  // We return the locally-sourced `galleries` for the UI to render,
  // and the loading/error state from the server fetch.
  return {
    galleries, // This data is live from the local DB and ready for your FlatList
    isLoading: isLoading && galleries.length === 0, // Only show initial loading state
    isSyncing: isFetching, // A flag to show a background refresh indicator
    isError,
    error,
  };
};

/**
 * Hook to get a live, observable record for a *single* gallery.
 * It provides local data instantly, then syncs with the server in the background.
 *
 * @param galleryId The ID of the gallery to fetch.
 */
export const useGallery = (galleryId: string | null) => {
  const database = useDatabase();
  const [gallery, setGallery] = useState<Gallery | null>(null);

  // 1. OBSERVE LOCAL DATA
  // This effect subscribes to the local WatermelonDB record.
  // It provides the initial data and updates the UI *instantly*
  // if the record changes (e.g., from the sync in step 2).
  useEffect(() => {
    if (!galleryId) {
      setGallery(null);
      return;
    }

    const galleryCollection = database.collections.get<Gallery>('galleries');
    
    // findAndObserve provides a live-updating record
    const subscription = galleryCollection
      .findAndObserve(galleryId)
      .subscribe(
        (foundGallery) => {
          setGallery(foundGallery);
        },
        (error) => {
          // Handle case where the gallery might not be found locally yet
          console.warn(`Could not find gallery ${galleryId} locally. Waiting for sync.`);
          setGallery(null);
        }
      );

    // Clean up the subscription on unmount
    return () => subscription.unsubscribe();
  }, [database, galleryId]);


  // 2. FETCH & SYNC REMOTE DATA
  // useQuery handles background fetching, caching, and state management.
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['gallery', galleryId], 
    queryFn: async () => {
      if (!galleryId) return null;
      
      // 1. Fetch details from the server
      const remoteGallery = await getGalleryDetails(galleryId);
      await syncGalleryDetails(database, remoteGallery);
      
      return remoteGallery;
    },
    // Only run this query if galleryId is not null
    enabled: !!galleryId,
    staleTime: 60 * 1000, // 1 minute
  });

  // 3. RETURN VALUES
  return {
    gallery, // This is the live, local data for your UI
    isLoading: isLoading && !gallery, // Show loading only if we have no local data yet
    isSyncing: isFetching, // Show a refresh indicator
    isError,
    error,
  };
};

export const useCreateGallery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGallery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
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