import { useDatabase } from "@nozbe/watermelondb/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { randomId } from '@nozbe/watermelondb/utils';
import Photo from "../db/models/Photo";
import { uploadPhoto, deletePhoto } from "../services/api/photos.service";
import { useState, useEffect } from "react";
import { updateOptimisticPhoto } from "../services/sync/photos.sync";
import { Q } from "@nozbe/watermelondb";


/**
 * Hook for creating a new photo.
 * This implements the "Optimistic UI" (Outbox) pattern.
 */
export const useCreateOptimisticPhoto = () => {
    const database = useDatabase();
    const queryClient = useQueryClient();
    const { user } = useAuth();
  
    return useMutation({
      mutationFn: async (variables: { galleryId: string; localUri: string }) => {
        const { galleryId, localUri } = variables;
        if (!user) throw new Error('User not authenticated');
  
        // --- 1. OPTIMISTIC LOCAL CREATION ---
        const temporaryId = randomId();
        
        await database.write(async () => {
          const photosCollection = database.collections.get<Photo>('photos');
          await photosCollection.create(record => {
            record._raw.id = temporaryId;
            record.galleryId = galleryId;
            record.uploaderId = user.id;
            record.localUri = localUri;
            record.status = 'queued';
            record.createdAt = new Date().getTime();
          });
        });
  
        // --- 2. START BACKGROUND UPLOAD ---
        // We return the temporaryId so we can track it
        return { temporaryId, galleryId, localUri };
      },
      // This hook only handles the *initial* optimistic creation.
      // A separate background process (like `usePhotoUploadQueue` below)
      // will handle the actual upload.
      onError: (error) => {
        console.error("Failed to create optimistic photo record:", error);
      },
    });
  };

  /**
 * Hook to manage the actual upload queue.
 * This hook should be called from a high-level component (like GalleryScreen or App).
 * It will find queued photos and attempt to upload them.
 */
export const usePhotoUploadQueue = () => {
    const database = useDatabase();
    const [queuedPhotos, setQueuedPhotos] = useState<Photo[]>([]);
  
    // 1. Observe queued photos
    useEffect(() => {
      const photosCollection = database.collections.get<Photo>('photos');
      const query = photosCollection.query(
        Q.where('status', Q.oneOf(['queued', 'upload_failed']))
      );
      const subscription = query.observe().subscribe(setQueuedPhotos);
      return () => subscription.unsubscribe();
    }, [database]);
  
    // 2. Define the mutation that does the uploading
    const { mutate: processUpload } = useMutation({
      mutationFn: async (photo: Photo) => {
        // Set status to 'uploading'
        await database.write(async () => {
          await photo.update(record => {
            record.status = 'uploading';
          });
        });
  
        // Run the full upload flow
        const finalPhoto = await uploadPhoto(photo.localUri!, photo.galleryId);
        
        // Sync the final data
        await updateOptimisticPhoto(database, photo.id, finalPhoto);
      },
      onError: async (error, photo) => {
        console.error(`Failed to upload photo ${photo.id}:`, error);
        // Set status to 'upload_failed'
        await database.write(async () => {
          await photo.update(record => {
            record.status = 'upload_failed';
          });
        });
      },
    });
  
    // 3. Process the queue when it changes
    // This is a simple implementation; a real-world app
    // would use a network status listener and be more robust.
    useEffect(() => {
      const uploadingPhotos = queuedPhotos.filter(p => p.status === 'uploading');
      const pendingPhotos = queuedPhotos.filter(p => p.status === 'queued' || p.status === 'upload_failed');
  
      // Only try to upload one photo at a time (for simplicity)
      if (uploadingPhotos.length === 0 && pendingPhotos.length > 0) {
        console.log(`[UploadQueue] Found ${pendingPhotos.length} photos to upload. Starting with one.`);
        processUpload(pendingPhotos[0]);
      }
    }, [queuedPhotos, processUpload]);
  };
  
  /**
   * Hook for deleting a photo.
   */
  export const useDeletePhoto = () => {
    const database = useDatabase();
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async (photo: Photo) => {
        return deletePhoto(photo.galleryId, photo.id);
      },
      onMutate: async (photo: Photo) => {
        // Optimistic delete
        await database.write(async () => {
          await photo.destroyPermanently();
        });
      },
      onError: (error, photo) => {
        // Rollback by invalidating
        queryClient.invalidateQueries({ queryKey: ['gallery', photo.galleryId] });
      },
    });
};