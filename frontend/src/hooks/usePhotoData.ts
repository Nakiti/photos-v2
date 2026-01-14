import { useDatabase } from "@nozbe/watermelondb/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {v4 as uuid} from "uuid"
import Photo from "../db/models/Photo";
import { uploadPhoto, deletePhoto, uploadPhotoFlow } from "../services/api/photos.service";
import { useState, useEffect } from "react";
import { updateOptimisticPhoto } from "../services/sync/photos.sync";
import { recordLocalAttempt, findAttemptByPhotoId, markAttemptConfirmed, markAttemptRejected } from "../services/rateLimit.service";
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

          console.log("local uris ", thumbnail.uri)
          
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
  
          // Record the upload attempt for rate limiting
          await recordLocalAttempt(database, galleryId, user.id, temporaryId);
  
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
   * Hook for creating multiple photos in a single batch operation.
   * More efficient than calling useCreateOptimisticPhoto multiple times.
   * Resizes all images in parallel and executes a single database batch write.
   */
  export const useCreateOptimisticPhotos = () => {
    const database = useDatabase();
    const { user } = useAuth();
  
    return useMutation({
      mutationFn: async (variables: { 
        galleryId: string; 
        localUris: string[]; 
        tagIds: string[] 
      }) => {
        const { galleryId, localUris, tagIds } = variables;
        if (!user) throw new Error('User not authenticated');
        if (localUris.length === 0) return { count: 0 };

        try {
          // --- 1. RESIZE ALL IMAGES IN PARALLEL ---
          const resizePromises = localUris.map(localUri => 
            Promise.all([
              ImageResizer.createResizedImage(
                localUri,
                FULL_IMAGE_WIDTH,
                FULL_IMAGE_WIDTH,
                IMAGE_FORMAT,
                FULL_IMAGE_QUALITY,
                0,
                undefined
              ),
              ImageResizer.createResizedImage(
                localUri,
                THUMB_IMAGE_WIDTH,
                THUMB_IMAGE_WIDTH,
                IMAGE_FORMAT,
                THUMB_IMAGE_QUALITY,
                0,
                undefined
              )
            ])
          );

          const resizeResults = await Promise.all(resizePromises);
          // resizeResults is an array of [fullImage, thumbnail] pairs

          // --- 2. PREPARE ALL DATABASE OPERATIONS ---
          const photosCollection = database.collections.get<Photo>('photos');
          const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
          const operations: any[] = [];

          for (let i = 0; i < resizeResults.length; i++) {
            const [fullImage, thumbnail] = resizeResults[i];
            const temporaryId = uuid();

            // Prepare photo creation
            const newPhotoOp = photosCollection.prepareCreate(record => {
              record._raw.id = temporaryId;
              record.galleryId = galleryId;
              record.uploaderId = user.id;
              record.localUri = fullImage.uri;
              record.localThumbnailUri = thumbnail.uri;
              record.status = 'queued';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (record as any)._raw.created_at = Date.now();
            });
            operations.push(newPhotoOp);

            // Prepare tag operations for this photo
            const tagOperations = tagIds.map(tagId =>
              photoTagsCollection.prepareCreate(record => {
                record.photoId = temporaryId;
                record.tagId = tagId;
              })
            );
            operations.push(...tagOperations);
          }

          // --- 3. EXECUTE SINGLE BATCH OPERATION ---
          await database.write(async () => {
            await database.batch(...operations);
          });

          console.log(`[Batch] Created ${resizeResults.length} optimistic photos`);
          return { count: resizeResults.length };
        } catch (error) {
          console.error("Failed to create optimistic photos:", error);
          throw error;
        }
      },
      onError: (error) => {
        console.error("Failed to create optimistic photos:", error);
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

        try {
          const finalPhoto = await uploadPhotoFlow(
              photo.galleryId,
              photo.localUri!,
              photo.localThumbnailUri!,
              tagIds
          )
            
          // Sync the final data
          await updateOptimisticPhoto(database, photo.id, finalPhoto);
          
          // Mark attempt as confirmed
          const attempt = await findAttemptByPhotoId(database, photo.id);
          if (attempt) {
            await markAttemptConfirmed(database, attempt.id, photo.id);
          }
        } catch (uploadError: any) {
          // Check if it's a 429 rate limit error
          if (uploadError?.response?.status === 429) {
            const retryAfterHeader = uploadError.response?.headers?.['retry-after'];
            const retryAfter = retryAfterHeader 
              ? Date.now() + (parseInt(retryAfterHeader, 10) * 1000)
              : Date.now() + (60 * 60 * 1000); // Default to 1 hour

            // Mark attempt as rejected
            const attempt = await findAttemptByPhotoId(database, photo.id);
            if (attempt) {
              await markAttemptRejected(database, attempt.id, retryAfter);
            }

            // Set photo status to sync_pending
            await database.write(async () => {
              await photo.update(record => {
                record.status = 'sync_pending';
                record.retryAfter = retryAfter;
              });
            });

            throw uploadError; // Re-throw to trigger onError
          } else {
            // Other errors: mark as upload_failed
            await database.write(async () => {
              await photo.update(record => {
                record.status = 'upload_failed';
              });
            });
            throw uploadError;
          }
        }
      },
      onError: async (error, photo) => {
        console.error(`Failed to upload photo ${photo.id}:`, error);
        // Status already set in mutationFn, just log
      }
    });
  
    // 3. Process the queue when it changes
    // This is a simple implementation; a real-world app
    // would use a network status listener and be more robust.
    useEffect(() => {
      const uploadingPhotos = queuedPhotos.filter(p => p.status === 'uploading');
      const pendingPhotos = queuedPhotos.filter(p => p.status === 'queued' || (p.status === 'sync_pending' && (!p.retryAfter || p.retryAfter <= Date.now())));
  
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