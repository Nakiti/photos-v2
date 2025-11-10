import { Database, Q } from '@nozbe/watermelondb';
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

  const remoteUserMap = new Map<string, any>();
  for (const rf of remoteAll) {
    if (rf.otherUser) {
      remoteUserMap.set(rf.otherUser.id, rf.otherUser);
    }
  }
  const remoteUserIds = Array.from(remoteUserMap.keys())

  const localUsers = await usersCollection
    .query(Q.where('id', Q.oneOf(remoteUserIds)))
    .fetch();
  const localUserMap = new Map(localUsers.map((u: any) => [u.id, u]))

  const localFriendships = await friendshipsCollection.query().fetch();
  const localMap = new Map(localFriendships.map((f: any) => [f.id, f]));
  const remoteIds = new Set(remoteAll.map(f => f.id));

  const operations: any[] = [];

  // Create or update
  for (const rf of remoteAll) {
    const other = rf.otherUser;
    if (other) {
      const localUser = localUserMap.get(other.id);

      console.log('--- SYNC USER CHECK ---');
      console.log('Remote API data (other):', other);
      console.log('Local DB data (localUser):', localUser);

      if (localUser) {
        // 1. It exists: Prepare an UPDATE
        operations.push(
          localUser.prepareUpdate((record: any) => {
            record.name = other.name ?? record.name;
            record.avatar_url = other.avatarUrl ?? record.avatar_url;
            record.handle = other.handle ?? record.handle
          })
        );
      } else {
        // 2. It doesn't exist: Prepare a CREATE
        operations.push(
          usersCollection.prepareCreate((record: any) => {
            record._raw.id = other.id; // IMPORTANT: Set the ID
            record.name = other.name;
            record.avatar_url = other.avatarUrl;
            record.handle = other.handle; // IMPORTANT: Set handle on creation
          })
        );
      }
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