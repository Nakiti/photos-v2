import { Database, Q } from '@nozbe/watermelondb';
import Gallery from '../../db/models/Gallery'; // Your WatermelonDB Gallery model
import { GalleryApiResponse } from '../api/gallery.service';

/**
 * Reconciles a list of galleries from the server with the local WatermelonDB.
 * It creates, updates, and deletes local records to match the server state.
 * @param database - The WatermelonDB instance.
 * @param remoteGalleries - An array of gallery objects from the API.
 */
export const syncGalleries = async (database: Database, remoteGalleries: GalleryApiResponse[]) => {
  const galleriesCollection = database.collections.get<Gallery>('galleries');

  // Fetch all local galleries to compare against the remote list
  const localGalleries = await galleriesCollection.query().fetch();
  const localGalleryMap = new Map(localGalleries.map(g => [g.id, g]));
  const remoteGalleryIds = new Set(remoteGalleries.map(g => g.id));

  const operations: any[] = [];

  // --- Identify records to create or update ---
  for (const remoteGallery of remoteGalleries) {
    const local = localGalleryMap.get(remoteGallery.id);
    if (local) {
      // Record exists, check if it needs an update
      // A more advanced sync would compare a `updated_at` timestamp
      const remoteLastPhotoAt = remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : null;
      const remoteStartDate = remoteGallery.startDate ? new Date(remoteGallery.startDate).getTime() : null;
      const remoteEndDate = remoteGallery.endDate ? new Date(remoteGallery.endDate).getTime() : null;
      const needsUpdate =
        local.name !== remoteGallery.name ||
        local.iconUrl !== remoteGallery.iconUrl ||
        local.joinRequiresApproval !== remoteGallery.joinRequiresApproval ||
        local.addPermission !== remoteGallery.addPermission ||
        local.deletePermission !== remoteGallery.deletePermission ||
        local.editPermission !== (remoteGallery as any).editPermission ||
        local.defaultTagId !== remoteGallery.defaultTagId ||
        local.communityId !== remoteGallery.communityId ||
        local.communityName !== remoteGallery.communityName ||
        local.lastPhotoAt !== remoteLastPhotoAt ||
        local.photoCount !== (remoteGallery.photoCount ?? 0) ||
        local.memberCount !== (remoteGallery.memberCount ?? 0) ||
        local.startDate !== remoteStartDate ||
        local.endDate !== remoteEndDate ||
        local.location !== remoteGallery.location ||
        local.shareableLink !== remoteGallery.shareableLink ||
        local.lastUploadedByName !== (remoteGallery.lastUploadedByName ?? undefined);
      if (needsUpdate) {
        operations.push(
          local.prepareUpdate(record => {
            record.name = remoteGallery.name;
            record.iconUrl = remoteGallery.iconUrl;
            record.joinRequiresApproval = remoteGallery.joinRequiresApproval ?? false;
            record.addPermission = remoteGallery.addPermission as 'ANYONE' | 'ADMIN';
            record.deletePermission = remoteGallery.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN';
            record.editPermission = remoteGallery.editPermission as 'ANYONE' | 'ADMIN';
            record.defaultTagId = remoteGallery.defaultTagId ?? null;
            record.communityId = remoteGallery.communityId ?? undefined;
            record.communityName = remoteGallery.communityName ?? undefined;
            record.lastPhotoAt = remoteLastPhotoAt ?? undefined;
            record.photoCount = remoteGallery.photoCount ?? 0;
            record.memberCount = remoteGallery.memberCount ?? 0;
            record.startDate = remoteStartDate ?? undefined;
            record.endDate = remoteEndDate ?? undefined;
            record.location = remoteGallery.location ?? undefined;
            record.shareableLink = remoteGallery.shareableLink ?? undefined;
            record.lastUploadedByName = remoteGallery.lastUploadedByName ?? undefined;
          })
        );
      }
    } else {
      // Record does not exist, prepare to create it
      operations.push(
        galleriesCollection.prepareCreate(record => {
          record._raw.id = remoteGallery.id;
          record.name = remoteGallery.name;
          record.type = remoteGallery.type;
          record.iconUrl = remoteGallery.iconUrl;
          record.ownerId = remoteGallery.ownerId;
          record.joinRequiresApproval = remoteGallery.joinRequiresApproval ?? false;
          record.addPermission = remoteGallery.addPermission as 'ANYONE' | 'ADMIN';
          record.deletePermission = remoteGallery.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN';
          record.editPermission = remoteGallery.editPermission as 'ANYONE' | 'ADMIN';
          record.defaultTagId = remoteGallery.defaultTagId ?? null;
          record.communityId = remoteGallery.communityId ?? undefined;
          record.communityName = remoteGallery.communityName ?? undefined;
          record.lastPhotoAt = remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : undefined;
          record.photoCount = remoteGallery.photoCount ?? 0;
          record.memberCount = remoteGallery.memberCount ?? 0;
          record.startDate = remoteGallery.startDate ? new Date(remoteGallery.startDate).getTime() : undefined;
          record.endDate = remoteGallery.endDate ? new Date(remoteGallery.endDate).getTime() : undefined;
          record.location = remoteGallery.location ?? undefined;
          record.shareableLink = remoteGallery.shareableLink ?? undefined;
          record.lastUploadedByName = (remoteGallery as any).lastUploadedByName ?? undefined;
        })
      );
    }
  }

  // --- Identify records to delete ---
  for (const localGallery of localGalleries) {
    if (!remoteGalleryIds.has(localGallery.id)) {
      operations.push(localGallery.prepareDestroyPermanently());
    }
  }

  // --- Execute all operations in a single batch transaction ---
  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} gallery operations.`);
  } else {
    console.log('👍 Galleries are already up to date.');
  }
};

/**
 * Upserts a single gallery's details from the API into the local WatermelonDB.
 * This is used when fetching details for one gallery.
 */
export const syncGalleryDetails = async (
  database: Database,
  remoteGallery: GalleryApiResponse,
) => {
  const galleriesCollection = database.collections.get<Gallery>('galleries');

  // --- 1. Find the local record ---
  let localGallery: Gallery | null = null;
  try {
    // Attempt to find the gallery by its ID
    localGallery = await galleriesCollection.find(remoteGallery.id);
  } catch (error) {
    // This is expected if the record doesn't exist locally yet
    localGallery = null;
  }

  // --- 2. Define the mapping logic ---
  // This function will apply the remote data to a local record
  const mapRemoteToLocal = (record: Gallery) => {
    record.name = remoteGallery.name;
    record.ownerId = remoteGallery.ownerId;
    record.iconUrl = remoteGallery.iconUrl;
    record.type = remoteGallery.type;
    record.joinRequiresApproval = remoteGallery.joinRequiresApproval ?? false;
    record.addPermission = remoteGallery.addPermission as 'ANYONE' | 'ADMIN';
    record.deletePermission = remoteGallery.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN';
    record.editPermission = remoteGallery.editPermission as 'ANYONE' | 'ADMIN';
    record.startDate = remoteGallery.startDate
      ? new Date(remoteGallery.startDate).getTime()
      : undefined;
    record.endDate = remoteGallery.endDate
      ? new Date(remoteGallery.endDate).getTime()
      : undefined;
    record.location = remoteGallery.location ?? undefined;
    record.shareableLink = remoteGallery.shareableLink ?? undefined;
    record.defaultTagId = remoteGallery.defaultTagId ?? null;
    record.communityId = remoteGallery.communityId ?? undefined;
    record.communityName = remoteGallery.communityName ?? undefined;
    record.lastPhotoAt = remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : undefined
    record.photoCount = remoteGallery.photoCount ?? 0
    record.memberCount = remoteGallery.memberCount ?? 0
    if (remoteGallery.lastUploadedByName !== undefined) {
      record.lastUploadedByName = remoteGallery.lastUploadedByName ?? undefined;
    }
    // Rate limiting fields
    if ((remoteGallery as any).uploadLimitPerHour !== undefined) {
      record.uploadLimitPerHour = (remoteGallery as any).uploadLimitPerHour;
    }
    if ((remoteGallery as any).rateLimitStateToken) {
      record.rateLimitStateToken = (remoteGallery as any).rateLimitStateToken;
    }
    if ((remoteGallery as any).rateLimitLastSynced) {
      record.rateLimitLastSynced = (remoteGallery as any).rateLimitLastSynced;
    }
  };

  // --- 3. Prepare the correct operation (Update or Create) ---
  const operation = localGallery
    ? // A. If it exists, PREPARE UPDATE
      localGallery.prepareUpdate(mapRemoteToLocal)
    : // B. If it does not exist, PREPARE CREATE
      galleriesCollection.prepareCreate((record) => {
        record._raw.id = remoteGallery.id; // Set the server's ID
        mapRemoteToLocal(record); // Apply all other fields
      });

  // --- 4. Execute the operation in a batch ---
  await database.write(async () => {
    await database.batch(operation);
  });

  console.log(`✅ Synced details for gallery ${remoteGallery.id}`);
};

export const syncCommunityGalleries = async (
  database: Database, 
  remoteGalleries: GalleryApiResponse[],
  communityId: string
) => {
  const galleriesCollection = database.collections.get<Gallery>('galleries');

  // Only fetch local galleries for this community (much faster!)
  const localGalleries = await galleriesCollection
    .query(Q.where('community_id', communityId))
    .fetch();
  
  const localGalleryMap = new Map(localGalleries.map(g => [g.id, g]));
  const remoteGalleryIds = new Set(remoteGalleries.map(g => g.id));

  const operations: any[] = [];

  // --- Identify records to create or update ---
  for (const remoteGallery of remoteGalleries) {
    const local = localGalleryMap.get(remoteGallery.id);
    if (local) {
      // Record exists, check if it needs an update
      // Compare more fields to catch all changes
      const needsUpdate = 
        local.name !== remoteGallery.name || 
        local.iconUrl !== remoteGallery.iconUrl || 
        local.joinRequiresApproval !== remoteGallery.joinRequiresApproval || 
        local.addPermission !== remoteGallery.addPermission || 
        local.deletePermission !== remoteGallery.deletePermission ||
        local.type !== remoteGallery.type ||
        local.ownerId !== remoteGallery.ownerId ||
        local.location !== remoteGallery.location ||
        local.shareableLink !== remoteGallery.shareableLink ||
        local.defaultTagId !== remoteGallery.defaultTagId ||
        local.communityId !== remoteGallery.communityId ||
        local.communityName !== remoteGallery.communityName ||
        local.photoCount !== (remoteGallery.photoCount ?? 0) ||
        local.memberCount !== (remoteGallery.memberCount ?? 0) ||
        // Check dates (convert remote to timestamp for comparison)
        local.startDate !== (remoteGallery.startDate ? new Date(remoteGallery.startDate).getTime() : null) ||
        local.endDate !== (remoteGallery.endDate ? new Date(remoteGallery.endDate).getTime() : null) ||
        local.lastPhotoAt !== (remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : null) ||
        local.lastUploadedByName !== (remoteGallery.lastUploadedByName ?? undefined);

      if (needsUpdate) {
        operations.push(
          local.prepareUpdate(record => {
            record.name = remoteGallery.name;
            record.iconUrl = remoteGallery.iconUrl;
            record.joinRequiresApproval = remoteGallery.joinRequiresApproval;
            record.addPermission = remoteGallery.addPermission as 'ANYONE' | 'ADMIN';
            record.deletePermission = remoteGallery.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN';
            record.type = remoteGallery.type;
            record.ownerId = remoteGallery.ownerId;
            record.location = remoteGallery.location ?? undefined;
            record.shareableLink = remoteGallery.shareableLink ?? undefined;
            record.startDate = remoteGallery.startDate
              ? new Date(remoteGallery.startDate).getTime()
              : undefined;
            record.endDate = remoteGallery.endDate
              ? new Date(remoteGallery.endDate).getTime()
              : undefined;
            record.defaultTagId = remoteGallery.defaultTagId ?? null;
            record.communityId = remoteGallery.communityId ?? undefined;
            record.communityName = remoteGallery.communityName ?? undefined;
            record.lastPhotoAt = remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : undefined;
            record.photoCount = remoteGallery.photoCount ?? 0;
            record.memberCount = remoteGallery.memberCount ?? 0;
            record.lastUploadedByName = remoteGallery.lastUploadedByName ?? undefined;
            // Update timestamps
            if ('created_at' in (record as any)._raw && remoteGallery.createdAt) {
              (record as any)._raw.created_at = new Date(remoteGallery.createdAt).getTime();
            }
            if ('updated_at' in (record as any)._raw && remoteGallery.updatedAt) {
              (record as any)._raw.updated_at = new Date(remoteGallery.updatedAt).getTime();
            }
          })
        );
      }
    } else {
      // Record does not exist, prepare to create it
      operations.push(
        galleriesCollection.prepareCreate(record => {
          record._raw.id = remoteGallery.id;
          record.name = remoteGallery.name;
          record.type = remoteGallery.type;
          record.iconUrl = remoteGallery.iconUrl;
          record.ownerId = remoteGallery.ownerId;
          record.joinRequiresApproval = remoteGallery.joinRequiresApproval;
          record.addPermission = remoteGallery.addPermission as 'ANYONE' | 'ADMIN';
          record.deletePermission = remoteGallery.deletePermission as 'ADMINS_AUTHORS' | 'ADMIN';
          record.location = remoteGallery.location ?? undefined;
          record.shareableLink = remoteGallery.shareableLink ?? undefined;
          record.startDate = remoteGallery.startDate
            ? new Date(remoteGallery.startDate).getTime()
            : undefined;
          record.endDate = remoteGallery.endDate
            ? new Date(remoteGallery.endDate).getTime()
            : undefined;
          record.defaultTagId = remoteGallery.defaultTagId ?? null;
          record.communityId = remoteGallery.communityId ?? undefined;
          record.communityName = remoteGallery.communityName ?? undefined;
          record.lastPhotoAt = remoteGallery.lastPhotoAt ? new Date(remoteGallery.lastPhotoAt).getTime() : undefined;
          record.photoCount = remoteGallery.photoCount ?? 0;
          record.memberCount = remoteGallery.memberCount ?? 0;
          record.lastUploadedByName = remoteGallery.lastUploadedByName ?? undefined;
          // Set timestamps
          if (remoteGallery.createdAt) {
            (record as any)._raw.created_at = new Date(remoteGallery.createdAt).getTime();
          }
          if (remoteGallery.updatedAt) {
            (record as any)._raw.updated_at = new Date(remoteGallery.updatedAt).getTime();
          }
        })
      );
    }
  }

  // --- Identify records to delete (only for this community) ---
  for (const localGallery of localGalleries) {
    if (!remoteGalleryIds.has(localGallery.id)) {
      operations.push(localGallery.prepareDestroyPermanently());
    }
  }

  // --- Execute all operations in a single batch transaction ---
  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} community gallery operations.`);
  } else {
    console.log('👍 Community galleries are already up to date.');
  }
};