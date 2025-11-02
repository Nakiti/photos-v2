import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import Membership from '../../db/models/Membership';
import User from '../../db/models/User';

// Define the shape of the data coming from your API
// It's an array of objects, each containing membership and user data
interface RemoteMember {
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  membership: {
    id: string;
    joinedAt: string; // ISO date string from API
    status: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';
    role: 'ADMIN' | 'MEMBER';
    isMuted: boolean;
  };
}

/**
 * Reconciles the member list from the server with the local WatermelonDB.
 * @param database - The WatermelonDB instance.
 * @param galleryId - The ID of the gallery being synced.
 * @param remoteMembers - The array of member data from the API.
 */
export const syncMembers = async (
  database: Database,
  galleryId: string,
  remoteMembers: RemoteMember[],
  currentUserId: string,
) => {
  const membershipsCollection =
    database.collections.get<Membership>('memberships');
  const usersCollection = database.collections.get<User>('users');

  // --- 1. Fetch existing local data ---
  const localMemberships = await membershipsCollection
    .query(Q.where('gallery_id', galleryId))
    .fetch();
  const localMembershipMap = new Map(localMemberships.map((m) => [m.userId, m]));
  const remoteMemberUserIds = new Set(remoteMembers.map((m) => m.user.id));
  const remoteUserIds = remoteMembers.map((m) => m.user.id);
  const localUsers = await usersCollection
    .query(Q.where('id', Q.oneOf(remoteUserIds)))
    .fetch();
  const localUserMap = new Map(localUsers.map((u) => [u.id, u]));

  const operations: any[] = [];

  // --- 2. Loop through remote data to prep operations ---

  for (const remoteMember of remoteMembers) {
    const user = remoteMember.user;
    const membershipApi = remoteMember.membership;

    const localMembership = localMembershipMap.get(user.id);
    const localUser = localUserMap.get(user.id);

    // --- A. Upsert User Profile (This part is correct now) ---
    if (user.id !== currentUserId) {
      if (localUser) {
        // UPDATE USER
        if (
          localUser.name !== user.name ||
          localUser.avatarUrl !== user.avatarUrl ||
          localUser.handle !== user.handle 
        ) {
          operations.push(
            localUser.prepareUpdate((record) => {
              record.name = user.name;
              record.avatarUrl = user.avatarUrl;
              record.handle = user.handle;
            }),
          );
        }
      } else {
        // CREATE USER
        operations.push(
          usersCollection.prepareCreate((record) => {
            record._raw.id = user.id; // Set server ID
            record.name = user.name;
            record.avatarUrl = user.avatarUrl;
            record.handle = user.handle;
          }),
        );
      }
    }

    // --- B. Upsert Membership (THIS WAS MISSING) ---
    // This logic must be inside the loop.
    if (localMembership) {
      // UPDATE MEMBERSHIP: Check if local data is stale
      if (
        localMembership.status !== membershipApi.status ||
        localMembership.role !== membershipApi.role ||
        localMembership.isMuted != membershipApi.isMuted
      ) {
        operations.push(
          localMembership.prepareUpdate((record) => {
            record.status = membershipApi.status;
            record.role = membershipApi.role;
            record.isMuted = membershipApi.isMuted;
          }),
        );
      }
    } else {
      // CREATE MEMBERSHIP: New membership
      operations.push(
        membershipsCollection.prepareCreate((record) => {
          record._raw.id = membershipApi.id;
          record.gallery.id = galleryId;
          record.user.id = user.id;
          record.joinedAt = membershipApi.joinedAt 
          ? new Date(membershipApi.joinedAt).getTime() 
          : Date.now();
          record.status = membershipApi.status;
          record.role = membershipApi.role;
          record.isMuted = membershipApi.isMuted;
        }),
      );
    }
  } // <-- End of for...of loop

  // --- 3. Delete Old Memberships ---
  for (const localMembership of localMemberships) {
    if (!remoteMemberUserIds.has(localMembership.userId)) {
      operations.push(localMembership.prepareDestroyPermanently());
    }
  }

  // --- 4. Execute all operations in a single batch ---
  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(
      `✅ Synced ${operations.length} member operations for gallery ${galleryId}.`,
    );
  }
};

/**
 * Optimistically (and locally) removes a member from a gallery.
 * Used for instant UI feedback in hooks like useRemoveMember.
 * @param database - The WatermelonDB instance.
 * @param galleryId - The ID of the gallery.
 * @param userIdToRemove - The ID of the user to remove.
 */
export const removeMembershipLocally = async (
  database: Database,
  galleryId: string,
  userIdToRemove: string
) => {
  await database.write(async () => {
    const membershipsCollection = database.collections.get<Membership>('memberships');
    const membershipToDelete = await membershipsCollection.query(
      Q.where('gallery_id', galleryId),
      Q.where('user_id', userIdToRemove)
    ).fetch();

    if (membershipToDelete.length > 0) {
      await database.batch(
        membershipToDelete[0].prepareDestroyPermanently()
      );
    }
  });
};

