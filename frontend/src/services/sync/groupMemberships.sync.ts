import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import GroupMembership from '../../db/models/GroupMembership';
import User from '../../db/models/User';
import { GroupMember } from '../api/groupMemberships.service';

/**
 * Reconcile group members with local DB for a given group.
 */
export const syncGroupMembers = async (
  database: Database,
  groupId: string,
  remoteMembers: GroupMember[],
  currentUserId: string
) => {
  const membershipsCollection = database.collections.get<GroupMembership>('community_memberships');
  const usersCollection = database.collections.get<User>('users');

  // Load local memberships for this group
  const localMemberships = await membershipsCollection
    .query(Q.where('community_id', groupId))
    .fetch();
  const localMembershipMap = new Map(localMemberships.map(m => [m.userId, m]));
  const remoteUserIds = remoteMembers.map(m => m.user.id);
  const remoteUserIdSet = new Set(remoteUserIds);

  const localUsers = await usersCollection
    .query(Q.where('id', Q.oneOf(remoteUserIds)))
    .fetch();
  const localUserMap = new Map(localUsers.map(u => [u.id, u]));

  const operations: any[] = [];

  for (const rm of remoteMembers) {
    const user = rm.user;
    const membershipApi = rm.membership;

    const localUser = localUserMap.get(user.id);
    const localMembership = localMembershipMap.get(user.id);

    // Upsert user (skip self if your app handles current user elsewhere)
    if (user.id !== currentUserId) {
      if (localUser) {
        if (
          localUser.name !== user.name ||
          localUser.avatar_url !== user.avatarUrl ||
          localUser.handle !== user.handle
        ) {
          operations.push(
            localUser.prepareUpdate(record => {
              record.name = user.name;
              record.avatar_url = user.avatarUrl;
              record.handle = user.handle;
            })
          );
        }
      } else {
        operations.push(
          usersCollection.prepareCreate(record => {
            record._raw.id = user.id;
            record.name = user.name;
            record.avatar_url = user.avatarUrl;
            record.handle = user.handle;
          })
        );
      }
    }

    // Upsert membership
    if (localMembership) {
      const statusChanged = membershipApi.status && localMembership.status !== membershipApi.status;
      const roleChanged = localMembership.role !== membershipApi.role;
      const joinedAtChanged = membershipApi.joinedAt &&
        localMembership.joinedAt !== new Date(membershipApi.joinedAt).getTime();

      if (statusChanged || roleChanged || joinedAtChanged) {
        operations.push(
          localMembership.prepareUpdate(record => {
            if (roleChanged) record.role = membershipApi.role;
            if (statusChanged && membershipApi.status) record.status = membershipApi.status;
            if (joinedAtChanged && membershipApi.joinedAt) {
              record.joinedAt = new Date(membershipApi.joinedAt).getTime();
            }
          })
        );
      }
    } else {
      operations.push(
        membershipsCollection.prepareCreate(record => {
          record._raw.id = membershipApi.id;
          record.community.id = groupId;
          record.user.id = user.id;
          record.role = membershipApi.role;
          record.status = membershipApi.status || 'ACCEPTED';
          record.joinedAt = membershipApi.joinedAt
            ? new Date(membershipApi.joinedAt).getTime()
            : Date.now();
        })
      );
    }
  }

  // Delete memberships that no longer exist remotely
  for (const lm of localMemberships) {
    if (!remoteUserIdSet.has(lm.userId)) {
      operations.push(lm.prepareDestroyPermanently());
    }
  }

  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
    console.log(`✅ Synced ${operations.length} group member operations for group ${groupId}.`);
  }
};

/**
 * Optimistically remove a group membership locally (for instant UI).
 */
export const removeGroupMembershipLocally = async (
  database: Database,
  groupId: string,
  userIdToRemove: string
) => {
  await database.write(async () => {
    const membershipsCollection = database.collections.get<GroupMembership>('community_memberships');
    const toDelete = await membershipsCollection.query(
      Q.where('community_id', groupId),
      Q.where('user_id', userIdToRemove)
    ).fetch();
    if (toDelete.length > 0) {
      await database.batch(toDelete[0].prepareDestroyPermanently());
    }
  });
};
