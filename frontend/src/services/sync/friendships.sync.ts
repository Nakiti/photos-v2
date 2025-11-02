import { Database } from '@nozbe/watermelondb';
import Friendship from '../../db/models/Friendship';
import User from '../../db/models/User';
import { FriendshipsGroupedResponse, FriendshipApi } from '../api/friendships.service';

/**
 * Reconcile friendships from the server with the local WatermelonDB.
 * This syncs all categories: accepted friendships, pending incoming, and pending outgoing.
 *
 * Local Friendship table is expected to have at least:
 *  - requester_id (string)
 *  - receiver_id (string)
 *  - status (string)
 *  - created_at / updated_at (number) [optional depending on schema]
 */
export const syncFriendships = async (
  database: Database,
  remote: FriendshipsGroupedResponse
) => {
  const friendshipsCollection = database.collections.get<Friendship>('friendships');
  const usersCollection = database.collections.get<User>('users');
  const usersCollectionAny = usersCollection as any;

  const remoteAll: FriendshipApi[] = [
    ...remote.friendships,
    ...remote.pendingIncoming,
    ...remote.pendingOutgoing,
  ];

  const localFriendships = await friendshipsCollection.query().fetch();
  const localMap = new Map(localFriendships.map((f: any) => [f.id, f]));
  const remoteIds = new Set(remoteAll.map(f => f.id));

  const operations: any[] = [];

  // Create or update
  for (const rf of remoteAll) {
    // Upsert other user profile if provided
    const other = rf.otherUser;
    if (other) {
      operations.push(
        usersCollectionAny.prepareUpsert(other.id, (record: any) => {
          record.name = other.name ?? record.name;
          record.avatarUrl = other.avatarUrl ?? record.avatarUrl;
          record.handle = record.handle;
        })
      );
    }

    const local = localMap.get(rf.id);
    if (local) {
      // Only update when server is newer
      const localUpdatedAtMs = (local as any)._raw?.updated_at ?? 0;
      const remoteUpdatedAtMs = rf.updatedAt ? new Date(rf.updatedAt).getTime() : 0;
      if (remoteUpdatedAtMs > localUpdatedAtMs) {
        operations.push(
          local.prepareUpdate((record: any) => {
            // prefer writing to raw to avoid decorator requirements
            record._raw.requester_id = rf.requesterId;
            record._raw.receiver_id = rf.receiverId;
            record._raw.status = rf.status;
            // If your schema includes numeric timestamps
            if ('created_at' in record._raw && rf.createdAt) {
              record._raw.created_at = new Date(rf.createdAt).getTime();
            }
            if ('updated_at' in record._raw && rf.updatedAt) {
              record._raw.updated_at = new Date(rf.updatedAt).getTime();
            }
          })
        );
      }
    } else {
      operations.push(
        friendshipsCollection.prepareCreate((record: any) => {
          record._raw.id = rf.id;
          record._raw.requester_id = rf.requesterId;
          record._raw.receiver_id = rf.receiverId;
          record._raw.status = rf.status;
          if ('created_at' in record._raw && rf.createdAt) {
            record._raw.created_at = new Date(rf.createdAt).getTime();
          }
          if ('updated_at' in record._raw && rf.updatedAt) {
            record._raw.updated_at = new Date(rf.updatedAt).getTime();
          }
        })
      );
    }
  }

  // Delete local friendships not present remotely
  for (const lf of localFriendships) {
    if (!remoteIds.has((lf as any).id)) {
      operations.push(lf.prepareDestroyPermanently());
    }
  }

  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} friendship operations.`);
  } else {
    console.log('👍 Friendships are already up to date.');
  }
};