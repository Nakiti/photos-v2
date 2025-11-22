import { useDatabase } from "@nozbe/watermelondb/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {v4 as uuid} from "uuid"
import Photo from "../db/models/Photo";
import { uploadPhoto, deletePhoto, uploadPhotoFlow } from "../services/api/photos.service";
import { useState, useEffect } from "react";
import { updateOptimisticPhoto } from "../services/sync/photos.sync";
import { Q } from "@nozbe/watermelondb";
import ImageResizer from 'react-native-image-resizer'; // 1. Import the resizer
import PhotoTag from "../db/models/PhotoTag";

// Define our quality settings
const FULL_IMAGE_WIDTH = 1920; // Max width/height for "full" image
const FULL_IMAGE_QUALITY = 90; // High quality
const THUMB_IMAGE_WIDTH = 400; // Max width/height for "thumbnail"
const THUMB_IMAGE_QUALITY = 80; // Good enough quality
const IMAGE_FORMAT = 'JPEG';

/**
 * Hook for creating a new photo.
 * This implements the "Optimistic UI" (Outbox) pattern.
 */
export const useCreateOptimisticPhoto = () => {
    const database = useDatabase();
    const queryClient = useQueryClient();
    const { user } = useAuth();
  
    return useMutation({
      mutationFn: async (variables: { galleryId: string; localUri: string, tagIds: string[] }) => {
        const { galleryId, localUri, tagIds } = variables;
        if (!user) throw new Error('User not authenticated');
  
        try {
          // --- 2. CLIENT-SIDE RESIZING ---
          // Create the "full" 1MB version
          const fullImage = await ImageResizer.createResizedImage(
            localUri,
            FULL_IMAGE_WIDTH,
            FULL_IMAGE_WIDTH, // Using same for max height
            IMAGE_FORMAT,
            FULL_IMAGE_QUALITY,
            0, // Rotation
            undefined // Output path
          );
  
          // Create the "thumbnail" 30KB version
          const thumbnail = await ImageResizer.createResizedImage(
            localUri,
            THUMB_IMAGE_WIDTH,
            THUMB_IMAGE_WIDTH,
            IMAGE_FORMAT,
            THUMB_IMAGE_QUALITY,
            0,
            undefined
          );
          // --- End Resizing ---
  
          // --- 3. OPTIMISTIC LOCAL CREATION ---
          const temporaryId = uuid();
          
          await database.write(async () => {
            const photosCollection = database.collections.get<Photo>('photos');
            const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
  
            // Prepare the temporary Photo record (to batch with tag creates)
            const newPhotoOp = photosCollection.prepareCreate(record => {
              record._raw.id = temporaryId;
              record.galleryId = galleryId;
              record.uploaderId = user.id;
              record.localUri = fullImage.uri; // Save path to 1MB file
              record.localThumbnailUri = thumbnail.uri; // Save path to 30KB file
              record.status = 'queued';
              // created_at is required by schema; set at creation time
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (record as any)._raw.created_at = Date.now();
            });
  
            // Create optimistic PhotoTag records
            const tagOperations = tagIds.map(tagId =>
              photoTagsCollection.prepareCreate(record => {
                record.photoId = temporaryId;
                record.tagId = tagId;
              })
            );
            
            await database.batch(newPhotoOp, ...tagOperations);
          });
  
        } catch (error) {
          console.error("Failed to create optimistic photo record:", error);
          throw error; 
        }
      },
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

        const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags')
        const tags = await photoTagsCollection.query(Q.where('photo_id', photo.id)).fetch()
        const tagIds = tags.map(t => t.tagId)

        console.log("photo before upoad queue ", photo)

        const finalPhoto = await uploadPhotoFlow(
            photo.galleryId,
            photo.localUri!,
            photo.localThumbnailUri!,
            tagIds
        )
          
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
      const pendingPhotos = queuedPhotos.filter(p => p.status === 'queued');
  
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