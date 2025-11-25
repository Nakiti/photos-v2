import { Database } from '@nozbe/watermelondb';
import Community from '../../db/models/Community';
import { CommunityApiResponse, MyCommunitiesResponse } from '../api/communities.service';

/**
 * Reconcile communities (owned + memberships) from server with local DB.
 */
export const syncCommunities = async (
  database: Database,
  remote: MyCommunitiesResponse
) => {
  const communitiesCollection = database.collections.get<Community>('communities');

  // Combine, de-duplicate by id
  const combined = [...remote.owned, ...remote.memberships];
  const remoteMap = new Map<string, CommunityApiResponse>();
  for (const c of combined) {
    remoteMap.set(c.id, c);
  }
  const remoteCommunities = Array.from(remoteMap.values());
  const remoteIds = new Set(remoteCommunities.map(c => c.id));

  // Load locals
  const localCommunities = await communitiesCollection.query().fetch();
  const localMap = new Map(localCommunities.map(c => [c.id, c]));

  const operations: any[] = [];

  // Upserts
  for (const rc of remoteCommunities) {
    const local = localMap.get(rc.id);
    const mapRemoteToLocal = (record: Community) => {
      record.name = rc.name;
      record.description = rc.description ?? null;
      record.iconUrl = rc.iconUrl ?? null;
      record.ownerId = rc.ownerId;
      if ('created_at' in (record as any)._raw && rc.createdAt) {
        (record as any)._raw.created_at = new Date(rc.createdAt).getTime();
      }
      if ('updated_at' in (record as any)._raw && rc.updatedAt) {
        (record as any)._raw.updated_at = new Date(rc.updatedAt).getTime();
      }
    };

    if (local) {
      // Basic change detection; could compare updatedAt if available
      operations.push(local.prepareUpdate(mapRemoteToLocal));
    } else {
      operations.push(
        communitiesCollection.prepareCreate(record => {
          record._raw.id = rc.id;
          mapRemoteToLocal(record);
        })
      );
    }
  }

  // Deletions
  for (const lc of localCommunities) {
    if (!remoteIds.has(lc.id)) {
      operations.push(lc.prepareDestroyPermanently());
    }
  }

  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} community operations.`);
  } else {
    console.log('👍 Communities are already up to date.');
  }
};

/**
 * Upsert a single community details payload into local DB.
 */
export const syncCommunityDetails = async (
  database: Database,
  remoteCommunity: CommunityApiResponse
) => {
  const communitiesCollection = database.collections.get<Community>('communities');

  let local: Community | null = null;
  try {
    local = await communitiesCollection.find(remoteCommunity.id);
  } catch {
    local = null;
  }

  const mapRemoteToLocal = (record: Community) => {
    record.name = remoteCommunity.name;
    record.description = remoteCommunity.description ?? null;
    record.iconUrl = remoteCommunity.iconUrl ?? null;
    record.ownerId = remoteCommunity.ownerId;
    if ('created_at' in (record as any)._raw && remoteCommunity.createdAt) {
      (record as any)._raw.created_at = new Date(remoteCommunity.createdAt).getTime();
    }
    if ('updated_at' in (record as any)._raw && remoteCommunity.updatedAt) {
      (record as any)._raw.updated_at = new Date(remoteCommunity.updatedAt).getTime();
    }
  };

  const op = local
    ? local.prepareUpdate(mapRemoteToLocal)
    : communitiesCollection.prepareCreate(record => {
        record._raw.id = remoteCommunity.id;
        mapRemoteToLocal(record);
      });

  await database.write(async () => {
    await database.batch(op);
  });
  console.log(`✅ Synced details for community ${remoteCommunity.id}`);
};


