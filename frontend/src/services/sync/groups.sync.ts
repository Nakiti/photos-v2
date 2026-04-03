import { Database } from '@nozbe/watermelondb';
import Group from '../../db/models/Group';
import { GroupApiResponse, MyGroupsResponse } from '../api/groups.service';

/**
 * Reconcile groups (owned + memberships) from server with local DB.
 */
export const syncGroups = async (
  database: Database,
  remote: MyGroupsResponse
) => {
  const groupsCollection = database.collections.get<Group>('communities');

  // Combine, de-duplicate by id
  const combined = [...remote.owned, ...remote.memberships];
  const remoteMap = new Map<string, GroupApiResponse>();
  for (const c of combined) {
    remoteMap.set(c.id, c);
  }
  const remoteGroups = Array.from(remoteMap.values());
  const remoteIds = new Set(remoteGroups.map(c => c.id));

  // Load locals
  const localGroups = await groupsCollection.query().fetch();
  const localMap = new Map(localGroups.map(c => [c.id, c]));

  const operations: any[] = [];

  // Upserts
  for (const rc of remoteGroups) {
    const local = localMap.get(rc.id);
    const mapRemoteToLocal = (record: Group) => {
      record.name = rc.name;
      record.description = rc.description ?? null;
      record.iconUrl = rc.iconUrl ?? null;
      record.ownerId = rc.ownerId;
      record.joinRequiresApproval = rc.joinRequiresApproval ?? undefined;
      record.addPermission = rc.addPermission ?? undefined;
      record.deletePermission = rc.deletePermission ?? undefined;
      record.memberCount = rc.memberCount ?? 0;
      record.galleryCount = rc.galleryCount ?? 0;
      if ('created_at' in (record as any)._raw && rc.createdAt) {
        (record as any)._raw.created_at = new Date(rc.createdAt).getTime();
      }
      if ('updated_at' in (record as any)._raw && rc.updatedAt) {
        (record as any)._raw.updated_at = new Date(rc.updatedAt).getTime();
      }
    };

    if (local) {
      const needsUpdate =
        local.name !== rc.name ||
        local.description !== (rc.description ?? null) ||
        local.iconUrl !== (rc.iconUrl ?? null) ||
        local.ownerId !== rc.ownerId ||
        local.joinRequiresApproval !== rc.joinRequiresApproval ||
        local.addPermission !== rc.addPermission ||
        local.deletePermission !== rc.deletePermission ||
        local.memberCount !== (rc.memberCount ?? 0) ||
        local.galleryCount !== (rc.galleryCount ?? 0);
      if (needsUpdate) {
        operations.push(local.prepareUpdate(mapRemoteToLocal));
      }
    } else {
      operations.push(
        groupsCollection.prepareCreate(record => {
          record._raw.id = rc.id;
          mapRemoteToLocal(record);
        })
      );
    }
  }

  // Deletions
  for (const lc of localGroups) {
    if (!remoteIds.has(lc.id)) {
      operations.push(lc.prepareDestroyPermanently());
    }
  }

  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} group operations.`);
  } else {
    console.log('👍 Groups are already up to date.');
  }
};

/**
 * Upsert a single group details payload into local DB.
 */
export const syncGroupDetails = async (
  database: Database,
  remoteGroup: GroupApiResponse
) => {
  const groupsCollection = database.collections.get<Group>('communities');

  let local: Group | null = null;
  try {
    local = await groupsCollection.find(remoteGroup.id);
  } catch {
    local = null;
  }

  const mapRemoteToLocal = (record: Group) => {
    record.name = remoteGroup.name;
    record.description = remoteGroup.description ?? null;
    record.iconUrl = remoteGroup.iconUrl ?? null;
    record.ownerId = remoteGroup.ownerId;
    record.joinRequiresApproval = remoteGroup.joinRequiresApproval ?? undefined;
    record.addPermission = remoteGroup.addPermission ?? undefined;
    record.deletePermission = remoteGroup.deletePermission ?? undefined;
    record.memberCount = remoteGroup.memberCount ?? 0;
    record.galleryCount = remoteGroup.galleryCount ?? 0;
    if ('created_at' in (record as any)._raw && remoteGroup.createdAt) {
      (record as any)._raw.created_at = new Date(remoteGroup.createdAt).getTime();
    }
    if ('updated_at' in (record as any)._raw && remoteGroup.updatedAt) {
      (record as any)._raw.updated_at = new Date(remoteGroup.updatedAt).getTime();
    }
  };

  const op = local
    ? local.prepareUpdate(mapRemoteToLocal)
    : groupsCollection.prepareCreate(record => {
        record._raw.id = remoteGroup.id;
        mapRemoteToLocal(record);
      });

  await database.write(async () => {
    await database.batch(op);
  });
  console.log(`✅ Synced details for group ${remoteGroup.id}`);
};
