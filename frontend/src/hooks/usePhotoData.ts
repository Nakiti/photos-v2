import { useDatabase } from "@nozbe/watermelondb/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {v4 as uuid} from "uuid"
import Photo from "../db/models/Photo";
import { uploadPhoto, deletePhoto, uploadPhotoFlow } from "../services/api/photos.service";
import { useState, useEffect, useRef } from "react";
import { updateOptimisticPhoto } from "../services/sync/photos.sync";
import { recordLocalAttempt, findAttemptByPhotoId, markAttemptConfirmed, markAttemptRejected } from "../services/rateLimit.service";
import { Q } from "@nozbe/watermelondb";
import ImageResizer from 'react-native-image-resizer'; // 1. Import the resizer
import RNFS from 'react-native-fs';
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

          if (!fullImage?.uri || !thumbnail?.uri) {
            throw new Error('Image resizing failed: invalid output URI');
          }
  
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

          for (let i = 0; i < resizeResults.length; i++) {
            const [full, thumb] = resizeResults[i];
            if (!full?.uri || !thumb?.uri) {
              throw new Error(`Image resizing failed for item ${i}: invalid output URI`);
            }
          }

          // --- 2. PREPARE ALL DATABASE OPERATIONS ---
          const photosCollection = database.collections.get<Photo>('photos');
          const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
          const operations: any[] = [];
          const temporaryIds: string[] = [];

          for (let i = 0; i < resizeResults.length; i++) {
            const [fullImage, thumbnail] = resizeResults[i];
            const temporaryId = uuid();
            temporaryIds.push(temporaryId);

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

          // --- 4. RECORD UPLOAD ATTEMPTS FOR RATE-LIMIT TRACKING ---
          await Promise.all(
            temporaryIds.map(id => recordLocalAttempt(database, galleryId, user.id, id))
          );

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
const UPLOAD_CONCURRENCY = 3;

export const usePhotoUploadQueue = () => {
    const database = useDatabase();
    const [queuedPhotos, setQueuedPhotos] = useState<Photo[]>([]);
    const activeUploadsRef = useRef(0);
    // Exponential backoff: track next-allowed retry time per photo ID
    const retryDelayRef = useRef<Map<string, number>>(new Map());
    const retryNotBeforeRef = useRef<Map<string, number>>(new Map());

    // 1. Observe photos that need uploading (includes sync_pending for rate-limit retry)
    useEffect(() => {
      const photosCollection = database.collections.get<Photo>('photos');
      const query = photosCollection.query(
        Q.where('status', Q.oneOf(['queued', 'upload_failed', 'sync_pending']))
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

        // Capture local paths before the optimistic record is replaced
        const localUri = photo.localUri;
        const localThumbnailUri = photo.localThumbnailUri;

        try {
          const finalPhoto = await uploadPhotoFlow(
              photo.galleryId,
              localUri!,
              localThumbnailUri!,
              tagIds,
              photo.id, // clientId for socket deduplication
              async (s3Key) => {
                // Persist the assigned s3Key on the optimistic record so that the
                // syncPhotos conflict-detection guard can match it if the socket
                // event triggers a gallery refetch before the confirm response arrives.
                await database.write(async () => {
                  await photo.update(record => { record.s3Key = s3Key; });
                });
              },
          )

          // Sync the final data
          await updateOptimisticPhoto(database, photo.id, finalPhoto);

          // Mark attempt as confirmed
          const attempt = await findAttemptByPhotoId(database, photo.id);
          if (attempt) {
            await markAttemptConfirmed(database, attempt.id, photo.id);
          }

          // Successful upload — clear backoff state
          retryDelayRef.current.delete(photo.id);
          retryNotBeforeRef.current.delete(photo.id);

          // Clean up temporary resized files from device storage
          if (localUri) RNFS.unlink(localUri).catch(() => {});
          if (localThumbnailUri) RNFS.unlink(localThumbnailUri).catch(() => {});
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
            // Other errors: mark as upload_failed with exponential backoff
            const prevDelay = retryDelayRef.current.get(photo.id) || 1000;
            const nextDelay = Math.min(30000, prevDelay * 2);
            retryDelayRef.current.set(photo.id, nextDelay);
            retryNotBeforeRef.current.set(photo.id, Date.now() + nextDelay);

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
        // Backoff state already set in mutationFn
      }
    });
  
    // 3. Process the queue when it changes — up to UPLOAD_CONCURRENCY in parallel
    useEffect(() => {
      const now = Date.now();
      const pendingPhotos = queuedPhotos.filter(p => {
        if (p.status === 'queued') return true;
        if (p.status === 'upload_failed') {
          const notBefore = retryNotBeforeRef.current.get(p.id) || 0;
          return now >= notBefore;
        }
        if (p.status === 'sync_pending') {
          return !p.retryAfter || p.retryAfter <= now;
        }
        return false;
      });

      const slots = UPLOAD_CONCURRENCY - activeUploadsRef.current;
      const toProcess = pendingPhotos.slice(0, Math.max(0, slots));

      if (toProcess.length > 0) {
        console.log(`[UploadQueue] ${pendingPhotos.length} pending, ${activeUploadsRef.current} active — starting ${toProcess.length}`);
        toProcess.forEach(photo => {
          activeUploadsRef.current++;
          processUpload(photo, {
            onSettled: () => {
              activeUploadsRef.current--;
            },
          });
        });
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
      onError: (_error, photo) => {
        // Rollback by invalidating
        queryClient.invalidateQueries({ queryKey: ['gallery', photo.galleryId] });
      },
    });
};