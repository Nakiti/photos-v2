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
    const localPhotoTagMap = new Map<string, Set<string>>(); // e.g., { 'photo-123': Set('tag-abc', 'tag-def') }

    for (const pt of localPhotoTags) {
      if (!localPhotoTagMap.has(pt.photoId)) {
        localPhotoTagMap.set(pt.photoId, new Set());
      }
      localPhotoTagMap.get(pt.photoId)!.add(pt.tagId);
    }

    // --- 1.5. Fetch optimistic photos for conflict resolution ---
    // Get all unique galleryIds and uploaderIds from remote photos
    const galleryIds = Array.from(new Set(remotePhotos.map(p => p.galleryId)));
    const uploaderIds = Array.from(new Set(remotePhotos.map(p => p.uploaderId)));
    
    // Fetch optimistic photos that might match
    const optimisticPhotos = await photosCollection
      .query(
        Q.where('gallery_id', Q.oneOf(galleryIds)),
        Q.where('uploader_id', Q.oneOf(uploaderIds)),
        Q.where('status', Q.oneOf(['queued', 'uploading']))
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
        if (local.status === 'queued' || local.status === 'uploading') {
          console.log(
            `[Conflict][Sync] Skipping update for photo being uploaded: ` +
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
              // Map API field 'thumbnailUrl' to local column 'thumbnail_uri'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              record.thumbnailUri = (remotePhoto as any).thumbnailUrl;
              // Ensure status is synced after update
              record.status = 'synced';
            })
          );
          updateCount += 1;
        }
      } else {
        // Create - but first check if there's an optimistic photo that matches
        // This handles the case where socket event arrives before upload completes
        const optimisticKey = `${remotePhoto.galleryId}:${remotePhoto.uploaderId}`;
        const optimisticMatches = optimisticMap.get(optimisticKey) || [];

        // Check if any optimistic photo could be this one (by timestamp proximity)
        const photoCreatedAt = new Date(remotePhoto.createdAt).getTime();
        const now = Date.now();
        const timeWindow = 5 * 60 * 1000; // 5 minutes

        let matchedOptimistic = false;
        for (const optimisticPhoto of optimisticMatches) {
          const optimisticCreatedAt = optimisticPhoto.createdAt;
          // Compare absolute difference between timestamps
          const optimisticAge = now - optimisticCreatedAt;
          const photoAge = now - photoCreatedAt;
          const timeDiff = Math.abs(optimisticAge - photoAge);
          
          if (timeDiff < timeWindow) {
            console.log(
              `[Conflict][Sync] Matched remote photo to optimistic photo: ` +
              `optimistic=${optimisticPhoto.id} remote=${remotePhoto.id}`
            );
            // Don't create duplicate - the upload queue will update the optimistic photo
            matchedOptimistic = true;
            break;
          }
        }

        if (!matchedOptimistic) {
          // Create new photo (from another user, or no optimistic match)
          operations.push(
            photosCollection.prepareCreate(record => {
              record._raw.id = remotePhoto.id;
              record.galleryId = remotePhoto.galleryId;
              record.uploaderId = remotePhoto.uploaderId;
              record.s3Key = remotePhoto.s3Key;
              record.s3Url = remotePhoto.s3Url; 
              // Map API field 'thumbnailUrl' to local column 'thumbnail_uri'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              record.thumbnailUri = (remotePhoto as any).thumbnailUrl;
              record.status = 'synced';
              // WatermelonDB _raw typing doesn't include custom columns; cast to any
              (record as any)._raw.created_at = new Date(remotePhoto.createdAt).getTime();
            })
          );
          createCount += 1;
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
  
      // Find tags to delete
      // We must find the specific join table record to delete it
      for (const localTag of localPhotoTags.filter(pt => pt.photoId === remotePhoto.id)) {
        if (!remoteTagIdSet.has(localTag.tagId)) {
          operations.push(localTag.prepareDestroyPermanently());
          tagsRemoved += 1;
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
        console.log(`[Sync][Optimistic] replace temp -> final (temp=${temporaryId} final=${finalPhoto.id})`);
        // Find all optimistic photo_tag rows pointing to the temporary photo id
        const tempPhotoTags = await photoTagsCollection
          .query(Q.where('photo_id', temporaryId))
          .fetch();
        
        // We must re-create the record with the permanent ID,
        // as WatermelonDB IDs are immutable.
        const newRecord = photosCollection.prepareCreate(record => {
          record._raw.id = finalPhoto.id; // Set permanent server ID
          record.galleryId = finalPhoto.galleryId;
          record.uploaderId = finalPhoto.uploaderId;
          record.s3Key = finalPhoto.s3Key;
          record.s3Url = finalPhoto.s3Url;
          record.thumbnailUri = (finalPhoto as any).thumbnailUrl;
          record.status = 'synced';
        //   record.createdAt = new Date(finalPhoto.createdAt).getTime(); // i think i need to change it so that created_at is no longer

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