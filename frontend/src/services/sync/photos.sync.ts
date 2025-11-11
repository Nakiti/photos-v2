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
 export const syncTags = async (
    database: Database,
    galleryId: string,
    remoteTags: TagApi[]
  ) => {
    const tagsCollection = database.collections.get<Tag>('tags');
  
    // 1. Fetch all local tags for this gallery ONCE
    const localTags = await tagsCollection.query(Q.where('gallery_id', galleryId)).fetch();
    const localTagMap = new Map(localTags.map(t => [t.id, t]));
    const remoteTagIdSet = new Set(remoteTags.map(t => t.id));
  
    const operations: any[] = [];
  
    // 2. Loop and find create/update operations
    for (const remoteTag of remoteTags) {
      const local = localTagMap.get(remoteTag.id);
      if (local) {
        // It exists, check for update
        if (local.name !== remoteTag.name || local.color !== remoteTag.color) {
          operations.push(
            local.prepareUpdate(record => {
              record.name = remoteTag.name;
              record.color = remoteTag.color;
            })
          );
        }
      } else {
        // It doesn't exist, create it
        operations.push(
          tagsCollection.prepareCreate(record => {
            record._raw.id = remoteTag.id;
            record.name = remoteTag.name;
            record.color = remoteTag.color;
            record.galleryId = galleryId;
          })
        );
      }
    }
  
    // 3. Find delete operations
    for (const localTag of localTags) {
      if (!remoteTagIdSet.has(localTag.id)) {
        operations.push(localTag.prepareDestroyPermanently());
      }
    }
  
    // 4. Batch write
    if (operations.length > 0) {
      await database.write(async () => {
        await database.batch(...operations);
      });
      console.log(`✅ Synced ${operations.length} tag operations for gallery ${galleryId}.`);
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
      Q.where('gallery_id', galleryId)
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
    
    await database.write(async () => {
      try {
        const tempRecord = await photosCollection.find(temporaryId);
        
        // We must re-create the record with the permanent ID,
        // as WatermelonDB IDs are immutable.
        const newRecord = photosCollection.prepareCreate(record => {
          record._raw.id = finalPhoto.id; // Set permanent server ID
          record.galleryId = finalPhoto.galleryId;
          record.uploaderId = finalPhoto.uploaderId;
          record.s3Key = finalPhoto.s3Key;
          record.s3Url = finalPhoto.s3Url;
          record.status = 'synced';
          record.createdAt = new Date(finalPhoto.createdAt).getTime();
          // local_uri is no longer needed
        });
        
        const deleteOp = tempRecord.prepareDestroyPermanently();
        
        await database.batch(newRecord, deleteOp);
      } catch (error) {
        console.error('Error updating optimistic photo:', error);
      }
    });
};