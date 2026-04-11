import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import Membership from '../../db/models/Membership';
import User from '../../db/models/User';

interface RemoteMember {
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
    handle?: string;
  };
  membership: {
    id: string;
    joinedAt: string;
    role: 'ADMIN' | 'MEMBER';
    isMuted: boolean;
  };
}

export const syncMembers = async (
  database: Database,
  galleryId: string,
  remoteMembers: RemoteMember[],
  currentUserId: string,
) => {
  const membershipsCollection = database.collections.get<Membership>('memberships');
  const usersCollection = database.collections.get<User>('users');

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

  for (const remoteMember of remoteMembers) {
    const user = remoteMember.user;
    const membershipApi = remoteMember.membership;

    const localMembership = localMembershipMap.get(user.id);
    const localUser = localUserMap.get(user.id);

    if (user.id !== currentUserId) {
      if (localUser) {
        if (
          localUser.name !== user.name ||
          localUser.avatarUrl !== user.avatarUrl ||
          localUser.handle !== user.handle
        ) {
          operations.push(
            localUser.prepareUpdate((record) => {
              record.name = user.name;
              record.avatarUrl = user.avatarUrl ?? undefined;
              record.handle = user.handle ?? '';
            }),
          );
        }
      } else {
        operations.push(
          usersCollection.prepareCreate((record) => {
            record._raw.id = user.id;
            record.name = user.name;
            record.avatarUrl = user.avatarUrl ?? undefined;
            record.handle = user.handle ?? '';
          }),
        );
      }
    }

    if (localMembership) {
      if (
        localMembership.role !== membershipApi.role ||
        localMembership.isMuted !== membershipApi.isMuted
      ) {
        operations.push(
          localMembership.prepareUpdate((record) => {
            record.role = membershipApi.role;
            record.isMuted = membershipApi.isMuted;
          }),
        );
      }
    } else {
      operations.push(
        membershipsCollection.prepareCreate((record) => {
          record._raw.id = membershipApi.id;
          record.galleryId = galleryId;
          record.userId = user.id;
          record.joinedAt = membershipApi.joinedAt
            ? new Date(membershipApi.joinedAt).getTime()
            : Date.now();
          record.role = membershipApi.role;
          record.isMuted = membershipApi.isMuted;
        }),
      );
    }
  }

  for (const localMembership of localMemberships) {
    if (!remoteMemberUserIds.has(localMembership.userId)) {
      operations.push(localMembership.prepareDestroyPermanently());
    }
  }

  if (operations.length > 0) {
    await database.write(async () => {
      await database.batch(...operations);
    });
  }
};

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
