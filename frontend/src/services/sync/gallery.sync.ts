import { Database } from '@nozbe/watermelondb';
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
      if (local.name !== remoteGallery.name || local.iconUrl !== remoteGallery.iconUrl) {
        operations.push(
          local.prepareUpdate(record => {
            record.name = remoteGallery.name;
            record.iconUrl = remoteGallery.iconUrl;
            // map other updatable fields
          })
        );
      }
    } else {
      // Record does not exist, prepare to create it
      operations.push(
        galleriesCollection.prepareCreate(record => {
          record._raw.id = remoteGallery.id; // Use the server's ID
          record.name = remoteGallery.name;
          record.type = remoteGallery.type;
          record.iconUrl = remoteGallery.iconUrl;
          record.ownerId = remoteGallery.ownerId;
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
    record.joinRequiresApproval = remoteGallery.joinRequiresApproval;
    record.startDate = remoteGallery.startDate
      ? new Date(remoteGallery.startDate).getTime()
      : null;
    record.endDate = remoteGallery.endDate
      ? new Date(remoteGallery.endDate).getTime()
      : null;
    record.location = remoteGallery.location;
    record.shareableLink = remoteGallery.shareableLink;
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