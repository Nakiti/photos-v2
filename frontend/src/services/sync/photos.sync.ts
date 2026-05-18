import { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import Photo from "../../db/models/Photo";
import { Photo as PhotoApi } from "../../types";
import Tag from "../../db/models/Tag";
import PhotoTag from "../../db/models/PhotoTag";
import { TagApi } from "../api/tags.service";

/**
 * Syncs a list of new or updated photos from the server.
 * @param database - WatermelonDB instance
 *.
 * @param remotePhotos - Array of photo objects from the API
 * @param syncMode - 'merge' (create/update)
 */
 export const syncPhotos = async (
    database: Database,
    remotePhotos: PhotoApi[] // Assumes PhotoApi type has `photoTags: { id: string, tagId: string }[]`
  ) => {
    const photosCollection = database.collections.get<Photo>('photos');
    const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
    const operations: any[] = [];
    let createCount = 0;
    let updateCount = 0;
    let tagsAdded = 0;
    let tagsRemoved = 0;
  
    console.log(`[Sync][Photos] start, remote count=${remotePhotos.length}`);
  
    // --- 1. Batch-fetch all local data first (No N+1 queries) ---
    const photoIds = remotePhotos.map(p => p.id);
    const localPhotos = await photosCollection.query(Q.where('id', Q.oneOf(photoIds))).fetch();
    const localPhotoTags = await photoTagsCollection.query(Q.where('photo_id', Q.oneOf(photoIds))).fetch();
  
    // Create Maps for fast lookup
    const localPhotoMap = new Map(localPhotos.map(p => [p.id, p]));
    // photoId -> Set<tagId>  (add-side diffing)
    const localPhotoTagMap = new Map<string, Set<string>>();
    // "photoId:tagId" -> PhotoTag record  (O(1) delete-side lookup, eliminates O(n×m) filter)
    const localPhotoTagRecordMap = new Map<string, PhotoTag>();

    for (const pt of localPhotoTags) {
      if (!localPhotoTagMap.has(pt.photoId)) {
        localPhotoTagMap.set(pt.photoId, new Set());
      }
      localPhotoTagMap.get(pt.photoId)!.add(pt.tagId);
      localPhotoTagRecordMap.set(`${pt.photoId}:${pt.tagId}`, pt);
    }

    // --- 1.5. Fetch optimistic photos for conflict resolution ---
    // Get all unique galleryIds from remote photos
    const galleryIds = Array.from(new Set(remotePhotos.map(p => p.galleryId)));

    // Fetch optimistic photos that might match (includes sync_pending — rate-limited but not yet uploaded)
    const optimisticPhotos = await photosCollection
      .query(
        Q.where('gallery_id', Q.oneOf(galleryIds)),
        Q.where('status', Q.oneOf(['queued', 'uploading', 'sync_pending']))
      )
      .fetch();
    
    // Create a map of optimistic photos by galleryId and uploaderId for quick lookup
    const optimisticMap = new Map<string, Photo[]>();
    for (const optPhoto of optimisticPhotos) {
      const key = `${optPhoto.galleryId}:${optPhoto.uploaderId}`;
      if (!optimisticMap.has(key)) {
        optimisticMap.set(key, []);
      }
      optimisticMap.get(key)!.push(optPhoto);
    }
  
    // --- 2. Process all remote photos ---
    for (const remotePhoto of remotePhotos) {
      const local = localPhotoMap.get(remotePhoto.id);
  
      // A) Prepare Photo Upsert
      if (local) {
        // --- CONFLICT RESOLUTION: Don't update if photo is being uploaded ---
        // If the local photo is queued or uploading, it means the user is currently
        // uploading it. The upload queue will handle updating it when complete.
        if (local.status === 'queued' || local.status === 'uploading' || local.status === 'sync_pending') {
          console.log(
            `[Conflict][Sync] Skipping update for photo pending upload: ` +
            `photoId=${remotePhoto.id} status=${local.status}`
          );
          continue; // Skip this photo, let upload queue handle it
        }

        // Update if any relevant field changed
        const needsUpdate =
          local.s3Url !== remotePhoto.s3Url ||
          local.s3Key !== remotePhoto.s3Key ||
          local.thumbnailUri !== (remotePhoto as any).thumbnailUrl;
        if (needsUpdate) {
          operations.push(
            local.prepareUpdate(record => {
              record.s3Url = remotePhoto.s3Url;
              record.s3Key = remotePhoto.s3Key;
              // Map API field 'thumbnailUrl' to local WatermelonDB field 'thumbnailUri'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              record.thumbnailUri = (remotePhoto as any).thumbnailUrl;
              // Ensure status is synced after update
              record.status = 'synced';
            })
          );
          updateCount += 1;
        }
      } else {
        // Not found locally — create it.
        // Guard: if a pending-upload optimistic record exists for the same s3Key
        // (set by upload flow before confirm), skip to avoid a duplicate.
        const s3Key = remotePhoto.s3Key;
        let matchedOptimistic = false;
        if (s3Key) {
          const optimisticKey = `${remotePhoto.galleryId}:${remotePhoto.uploaderId}`;
          const optimisticMatches = optimisticMap.get(optimisticKey) || [];
          matchedOptimistic = optimisticMatches.some(op => op.s3Key === s3Key);
          if (matchedOptimistic) {
            console.log(
              `[Conflict][Sync] Skipping create — optimistic record has same s3Key: ${s3Key}`
            );
          }
        }

        if (!matchedOptimistic) {
          operations.push(
            photosCollection.prepareCreate(record => {
              record._raw.id = remotePhoto.id;
              record.galleryId = remotePhoto.galleryId;
              record.uploaderId = remotePhoto.uploaderId;
              record.s3Key = remotePhoto.s3Key;
              record.s3Url = remotePhoto.s3Url;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              record.thumbnailUri = (remotePhoto as any).thumbnailUrl;
              record.status = 'synced';
              (record as any)._raw.created_at = new Date(remotePhoto.createdAt).getTime();
            })
          );
          createCount += 1;
        } else {
          // The upload queue's updateOptimisticPhoto will re-point tags from the temp ID to
          // the permanent ID once the confirm response arrives — skip tag reconciliation here
          // to avoid creating orphaned photo_tags rows against the permanent ID.
          continue;
        }
      }
  
      // B) Reconcile PhotoTags for this photo
      const remotePhotoTags = (((remotePhoto as any).photoTags || []) as { tagId: string }[]);
      const remoteTagIdSet = new Set(remotePhotoTags.map((pt: { tagId: string }) => pt.tagId));
      const localTagIdSet = localPhotoTagMap.get(remotePhoto.id) || new Set();
  
      // Find tags to add
      for (const remoteTagId of remoteTagIdSet) {
        if (!localTagIdSet.has(remoteTagId)) {
          operations.push(
            photoTagsCollection.prepareCreate(record => {
              record.photoId = remotePhoto.id;
              record.tagId = remoteTagId;
            })
          );
          tagsAdded += 1;
        }
      }
  
      // Find tags to delete — O(1) per tag via pre-built record map
      for (const localTagId of localTagIdSet) {
        if (!remoteTagIdSet.has(localTagId)) {
          const record = localPhotoTagRecordMap.get(`${remotePhoto.id}:${localTagId}`);
          if (record) {
            operations.push(record.prepareDestroyPermanently());
            tagsRemoved += 1;
          }
        }
      }
    }
  
    // --- 3. Execute all operations in a single batch ---
    if (operations.length > 0) {
      await database.write(async () => {
        await database.batch(...operations);
      });
      console.log(
        `✅ [Sync][Photos] batch complete ops=${operations.length} (created=${createCount}, updated=${updateCount}, tags+${tagsAdded}, tags-${tagsRemoved})`
      );
    } else {
      console.log('👍 [Sync][Photos] up to date (no changes)');
    }
  };

/**
 * Reconciles deleted photos.
 * @param database - WatermelonDB instance
 * @param galleryId - The gallery ID to check
 * @param remotePhotoIds - The complete list of photo IDs from the server
 */
export const reconcileDeletedPhotos = async (
    database: Database,
    galleryId: string,
    remotePhotoIds: string[]
  ) => {
    const photosCollection = database.collections.get<Photo>('photos');
    const localPhotos = await photosCollection.query(
      Q.where('gallery_id', galleryId),
      Q.where('status', 'synced')
    ).fetch();
    
    const remoteIdSet = new Set(remotePhotoIds);
    const operations: any[] = [];
  
    for (const localPhoto of localPhotos) {
      if (!remoteIdSet.has(localPhoto.id)) {
        operations.push(localPhoto.prepareDestroyPermanently());
      }
    }
  
    if (operations.length > 0) {
      await database.write(async () => {
        await database.batch(...operations);
      });
      console.log(`✅ Reconciled and deleted ${operations.length} photos.`);
    }
};


/**
 * Reconciles photos deleted on the server since a given timestamp.
 * More efficient than reconcileDeletedPhotos at scale because it only fetches
 * IDs of recently-deleted photos rather than all photo IDs in the gallery.
 */
export const reconcileDeletedPhotosSince = async (
  database: Database,
  galleryId: string,
  deletedPhotoIds: string[],
) => {
  if (deletedPhotoIds.length === 0) return;

  const photosCollection = database.collections.get<Photo>('photos');
  const localPhotos = await photosCollection
    .query(
      Q.where('id', Q.oneOf(deletedPhotoIds)),
      Q.where('status', Q.notEq('uploading')),
    )
    .fetch();

  if (localPhotos.length === 0) return;

  await database.write(async () => {
    await database.batch(...localPhotos.map(p => p.prepareDestroyPermanently()));
  });
  console.log(`✅ Delta-reconciled and deleted ${localPhotos.length} photos.`);
};

/**
 * Updates a 'queued' photo record with the permanent data from the server.
 * @param database - WatermelonDB instance
 * @param temporaryId - The client-side ID of the queued photo
 * @param finalPhoto - The permanent photo object from the server
 */
export const updateOptimisticPhoto = async (
    database: Database,
    temporaryId: string,
    finalPhoto: PhotoApi
  ) => {
    const photosCollection = database.collections.get<Photo>('photos');
    const photoTagsCollection = database.collections.get<PhotoTag>('photo_tags');
    
    await database.write(async () => {
      try {
        const tempRecord = await photosCollection.find(temporaryId);

        // Guard: if syncPhotos already created the permanent record (e.g., a socket-triggered
        // gallery refetch raced the confirm response), just clean up the temp record.
        let permanentAlreadyExists = false;
        try {
          await photosCollection.find(finalPhoto.id);
          permanentAlreadyExists = true;
        } catch {}

        const tempPhotoTags = await photoTagsCollection
          .query(Q.where('photo_id', temporaryId))
          .fetch();

        if (permanentAlreadyExists) {
          // Permanent record exists — delete the temp record and its orphaned tags.
          await database.batch(
            ...tempPhotoTags.map(pt => pt.prepareDestroyPermanently()),
            tempRecord.prepareDestroyPermanently(),
          );
          console.log(`[Sync][Optimistic] permanent already existed, cleaned up temp (temp=${temporaryId})`);
          return;
        }

        console.log(`[Sync][Optimistic] replace temp -> final (temp=${temporaryId} final=${finalPhoto.id})`);
        
        // We must re-create the record with the permanent ID,
        // as WatermelonDB IDs are immutable.
        const newRecord = photosCollection.prepareCreate(record => {
          record._raw.id = finalPhoto.id;
          record.galleryId = finalPhoto.galleryId;
          record.uploaderId = finalPhoto.uploaderId;
          record.s3Key = finalPhoto.s3Key;
          record.s3Url = finalPhoto.s3Url;
          record.thumbnailUri = (finalPhoto as any).thumbnailUrl;
          // Preserve the local thumbnail so the grid cell stays visible while
          // FastImage loads the CloudFront URL after the FlatList key change.
          record.localThumbnailUri = tempRecord.localThumbnailUri;
          record.status = 'synced';
          // Use the server-assigned timestamp so the local sync cursor stays accurate.
          if (finalPhoto.createdAt) {
            (record as any)._raw.created_at = new Date(finalPhoto.createdAt).getTime();
          }
        });
        
        const deleteOp = tempRecord.prepareDestroyPermanently();

        // Re-point existing optimistic photo_tags from temp id to the final id
        const tagUpdates = tempPhotoTags.map(pt =>
          pt.prepareUpdate(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r as any)._raw.photo_id = finalPhoto.id;
          })
        );

        await database.batch(newRecord, ...tagUpdates, deleteOp);
        console.log(
          `[Sync][Optimistic] completed replace (final=${finalPhoto.id}) tagUpdates=${tagUpdates.length}`
        );
      } catch (error) {
        console.error('Error updating optimistic photo:', error);
      }
    });
};

export const syncLikedStatus = async (database: Database, galleryId: string, likedPhotoIds: string[]) => {
  const photosCollection = database.collections.get<Photo>('photos');
  const localPhotos = await photosCollection.query(Q.where('gallery_id', galleryId)).fetch();
  const likedSet = new Set(likedPhotoIds);
  const ops = localPhotos
    .filter(p => (p.isLiked ?? false) !== likedSet.has(p.id))
    .map(p => p.prepareUpdate(r => { r.isLiked = likedSet.has(p.id); }));
  if (ops.length > 0) {
    await database.write(async () => { await database.batch(...ops); });
  }
};