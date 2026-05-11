import { useDatabase } from "@nozbe/watermelondb/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {v4 as uuid} from "uuid"
import Photo from "../db/models/Photo";
import { deletePhoto, uploadPhotoFlow } from "../services/api/photos.service";
import { useState, useEffect, useRef } from "react";
import { updateOptimisticPhoto } from "../services/sync/photos.sync";
import { recordLocalAttempt, findAttemptByPhotoId, markAttemptConfirmed, markAttemptRejected, checkLocalUploadLimit } from "../services/rateLimit.service";
import Gallery from "../db/models/Gallery";
import { Q } from "@nozbe/watermelondb";
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import PhotoTag from "../db/models/PhotoTag";
import NetInfo from "@react-native-community/netinfo";
import { getPreferences } from "../services/preferences.service";

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
    const { user } = useAuth();

    return useMutation({
      mutationFn: async (variables: { galleryId: string; localUri: string, tagIds: string[] }) => {
        const { galleryId, localUri, tagIds } = variables;
        if (!user) throw new Error('User not authenticated');

        try {
          // Copy the picker's temporary file to Documents so it survives app
          // restarts and OS cache eviction. Resize for upload happens at upload time.
          // Resize a display thumbnail now so the gallery shows something immediately.
          const temporaryId = uuid();
          const destPath = `${RNFS.DocumentDirectoryPath}/photo_${temporaryId}.jpg`;
          await RNFS.copyFile(localUri.replace(/^file:\/\//, ''), destPath);
          const persistedUri = `file://${destPath}`;

          const displayThumb = await ImageResizer.createResizedImage(
            persistedUri, THUMB_IMAGE_WIDTH, THUMB_IMAGE_WIDTH, IMAGE_FORMAT, THUMB_IMAGE_QUALITY, 0, undefined
          );

          await database.write(async () => {
            const photosCollection = database.collections.get<Photo>('photos');
            const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');

            const newPhotoOp = photosCollection.prepareCreate(record => {
              record._raw.id = temporaryId;
              record.galleryId = galleryId;
              record.uploaderId = user.id;
              record.localUri = persistedUri;
              record.localThumbnailUri = displayThumb?.uri ?? persistedUri;
              record.status = 'queued';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (record as any)._raw.created_at = Date.now();
            });

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
   * Executes a single database batch write; resizing happens at upload time.
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
          // Copy each picker temp file to Documents so it survives app restarts
          // and OS cache eviction. Also resize a display thumbnail immediately
          // so the gallery shows something before the upload completes.
          const createdPaths: string[] = [];
          let persistedEntries: { persistedUri: string; thumbUri: string }[];
          try {
            persistedEntries = await Promise.all(
              localUris.map(async (localUri) => {
                const destPath = `${RNFS.DocumentDirectoryPath}/photo_${uuid()}.jpg`;
                await RNFS.copyFile(localUri.replace(/^file:\/\//, ''), destPath);
                createdPaths.push(destPath);
                const persistedUri = `file://${destPath}`;
                const thumb = await ImageResizer.createResizedImage(
                  persistedUri, THUMB_IMAGE_WIDTH, THUMB_IMAGE_WIDTH, IMAGE_FORMAT, THUMB_IMAGE_QUALITY, 0, undefined
                );
                return { persistedUri, thumbUri: thumb?.uri ?? persistedUri };
              })
            );
          } catch (copyError) {
            await Promise.allSettled(createdPaths.map(p => RNFS.unlink(p)));
            throw copyError;
          }

          const photosCollection = database.collections.get<Photo>('photos');
          const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
          const operations: any[] = [];
          const temporaryIds: string[] = [];

          for (let i = 0; i < persistedEntries.length; i++) {
            const { persistedUri, thumbUri } = persistedEntries[i];
            const temporaryId = uuid();
            temporaryIds.push(temporaryId);

            const newPhotoOp = photosCollection.prepareCreate(record => {
              record._raw.id = temporaryId;
              record.galleryId = galleryId;
              record.uploaderId = user.id;
              record.localUri = persistedUri;
              record.localThumbnailUri = thumbUri;
              record.status = 'queued';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (record as any)._raw.created_at = Date.now();
            });
            operations.push(newPhotoOp);

            const tagOperations = tagIds.map(tagId =>
              photoTagsCollection.prepareCreate(record => {
                record.photoId = temporaryId;
                record.tagId = tagId;
              })
            );
            operations.push(...tagOperations);
          }

          await database.write(async () => {
            await database.batch(...operations);
          });

          await Promise.all(
            temporaryIds.map(id => recordLocalAttempt(database, galleryId, user.id, id))
          );

          console.log(`[Batch] Created ${persistedEntries.length} optimistic photos`);
          return { count: localUris.length };
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
    const [syncOverCellular, setSyncOverCellular] = useState(false);
    const [connectionType, setConnectionType] = useState<string | null>(null);
    const activeUploadsRef = useRef(0);
    // Track photos currently being processed to prevent double-firing on rapid emissions
    const inFlightIdsRef = useRef<Set<string>>(new Set());
    // Exponential backoff: track next-allowed retry time per photo ID
    const retryDelayRef = useRef<Map<string, number>>(new Map());
    const retryNotBeforeRef = useRef<Map<string, number>>(new Map());

    // Load cellular preference once on mount
    useEffect(() => {
      getPreferences().then(prefs => setSyncOverCellular(prefs.syncOverCellular));
    }, []);

    // Subscribe to network type changes so the queue re-evaluates when connectivity changes
    useEffect(() => {
      NetInfo.fetch().then(state => setConnectionType(state.type));
      const unsubscribe = NetInfo.addEventListener(state => setConnectionType(state.type));
      return unsubscribe;
    }, []);

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
        // Pre-check local rate limit before wasting S3 bandwidth
        const galleriesCollection = database.collections.get<Gallery>('galleries');
        const gallery = await galleriesCollection.find(photo.galleryId).catch(() => null);
        const limitPerHour = gallery?.uploadLimitPerHour || 200;

        const { allowed: localAllowed, currentCount } = await checkLocalUploadLimit(
          database, photo.galleryId, photo.uploaderId, limitPerHour
        );
        console.log(`[UploadQueue] rate check photo=${photo.id} allowed=${localAllowed} count=${currentCount}/${limitPerHour}`);

        if (!localAllowed) {
          const retryAfter = Date.now() + 60 * 60 * 1000;
          console.log(`[UploadQueue] rate limit hit photo=${photo.id} gallery=${photo.galleryId} — deferring to sync_pending`);
          await database.write(async () => {
            await photo.update(record => {
              record.status = 'sync_pending';
              record.retryAfter = retryAfter;
            });
          });
          throw Object.assign(new Error('Upload rate limit exceeded'), { response: { status: 429 } });
        }

        // Set status to 'uploading'
        console.log(`[UploadQueue] status queued→uploading photo=${photo.id}`);
        await database.write(async () => {
          await photo.update(record => {
            record.status = 'uploading';
          });
        });

        const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags')
        const tags = await photoTagsCollection.query(Q.where('photo_id', photo.id)).fetch()
        const tagIds = tags.map(t => t.tagId)

        // console.log("photo before upoad queue ", photo)

        // Capture the original asset URI stored at queue time
        const originalUri = photo.localUri;

        if (!originalUri) {
          console.error(`[UploadQueue] photo ${photo.id} missing localUri — skipping`);
          await database.write(async () => {
            await photo.update(record => { record.status = 'upload_failed'; });
          });
          throw new Error('Missing local file URI');
        }

        // Resize immediately before upload so temp files are never persisted
        // across app sessions and can't be evicted by the OS.
        const prefs = await getPreferences();
        const fullWidth = prefs.uploadQuality === 'original' ? 4032 : FULL_IMAGE_WIDTH;
        const fullQuality = prefs.uploadQuality === 'original' ? 100 : FULL_IMAGE_QUALITY;
        console.log(`[UploadQueue] resizing photo=${photo.id} quality=${prefs.uploadQuality}`);
        const [fullImage, thumbnail] = await Promise.all([
          ImageResizer.createResizedImage(originalUri, fullWidth, fullWidth, IMAGE_FORMAT, fullQuality, 0, undefined),
          ImageResizer.createResizedImage(originalUri, THUMB_IMAGE_WIDTH, THUMB_IMAGE_WIDTH, IMAGE_FORMAT, THUMB_IMAGE_QUALITY, 0, undefined),
        ]);

        if (!fullImage?.uri || !thumbnail?.uri) {
          await database.write(async () => {
            await photo.update(record => { record.status = 'upload_failed'; });
          });
          throw new Error('Image resizing failed');
        }

        const fullUri = fullImage.uri;
        const thumbUri = thumbnail.uri;

        try {
          console.log(`[UploadQueue] uploading photo ${photo.id} gallery=${photo.galleryId}`);
          const finalPhoto = await uploadPhotoFlow(
              photo.galleryId,
              fullUri,
              thumbUri,
              tagIds,
              photo.id, // clientId for socket deduplication
              async (s3Key) => {
                await database.write(async () => {
                  await photo.update(record => { record.s3Key = s3Key; });
                });
              },
          );
          console.log(`[UploadQueue] upload succeeded photo=${photo.id} finalId=${finalPhoto.id}`);

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

          // Clean up: resized temp files and the persisted Documents copy
          RNFS.unlink(fullUri).catch(() => {});
          RNFS.unlink(thumbUri).catch(() => {});
          RNFS.unlink(originalUri.replace(/^file:\/\//, '')).catch(() => {});
        } catch (uploadError: any) {
          console.error(`[UploadQueue] upload failed photo=${photo.id}:`, uploadError?.message ?? uploadError, uploadError?.response?.status ? `HTTP ${uploadError.response.status}` : '');
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
      const blockedByCellular = connectionType === 'cellular' && !syncOverCellular;
      const pendingPhotos = queuedPhotos.filter(p => {
        if (p.status === 'queued') return !blockedByCellular;
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
      const toProcess = pendingPhotos
        .filter(p => !inFlightIdsRef.current.has(p.id))
        .slice(0, Math.max(0, slots));

      if (toProcess.length > 0) {
        console.log(`[UploadQueue] ${pendingPhotos.length} pending, ${activeUploadsRef.current} active — starting ${toProcess.length}`);
        toProcess.forEach(photo => {
          inFlightIdsRef.current.add(photo.id);
          activeUploadsRef.current++;
          processUpload(photo, {
            onSettled: () => {
              inFlightIdsRef.current.delete(photo.id);
              activeUploadsRef.current--;
            },
          });
        });
      }
    }, [queuedPhotos, processUpload, connectionType, syncOverCellular]);
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
      onSuccess: async (_data, photo) => {
        const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
        const tags = await photoTagsCollection.query(Q.where('photo_id', photo.id)).fetch();
        await database.write(async () => {
          await database.batch(
            ...tags.map(t => t.prepareDestroyPermanently()),
            photo.prepareDestroyPermanently(),
          );
        });
      },
      onError: (_error, photo) => {
        queryClient.invalidateQueries({ queryKey: ['gallery', photo.galleryId] });
      },
    });
};