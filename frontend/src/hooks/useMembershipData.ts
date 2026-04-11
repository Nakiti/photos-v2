import { useDatabase } from "@nozbe/watermelondb/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Q } from "@nozbe/watermelondb";
import Membership from "../db/models/Membership";
import User from "../db/models/User";
import {
  getMembers,
  addMember,
  removeMember,
  getMemberSync,
  joinGallery,
  leaveGallery,
  promoteMember,
  updateMyMembership,
  getMyMembership,
  addCommunityMembersToGallery,
} from "../services/api/memberships.service";
import { syncMembers, removeMembershipLocally } from "../services/sync/memberships.sync";
import { useAuth } from "./useAuth";

export interface EnrichedMembership {
  membership: Membership;
  user: User;
}

export enum MembershipRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

/**
 * Hook to get a live-updating list of members for a gallery.
 */
export const useMemberships = (galleryId: string | null) => {
  const database = useDatabase();
  const [members, setMembers] = useState<EnrichedMembership[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!galleryId) {
      setMembers([]);
      return;
    }

    const membershipsCollection = database.collections.get<Membership>('memberships');
    const usersCollection = database.collections.get<User>('users');

    const query = membershipsCollection.query(Q.where('gallery_id', galleryId));

    const subscription = query
      .observeWithColumns(['user_id', 'role'])
      .subscribe(async (memberships) => {
        if (memberships.length === 0) {
          setMembers([]);
          return;
        }

        try {
          const userIds = [...new Set(memberships.map((m) => m.userId))];
          const users = await usersCollection
            .query(Q.where('id', Q.oneOf(userIds)))
            .fetch();
          const userMap = new Map(users.map((u) => [u.id, u]));

          const enriched: EnrichedMembership[] = [];
          for (const membership of memberships) {
            const user = userMap.get(membership.userId);
            if (user) {
              enriched.push({ membership, user });
            }
          }
          setMembers(enriched);
        } catch (error) {
          console.error('Error enriching memberships:', error);
          setMembers([]);
        }
      });

    return () => subscription.unsubscribe();
  }, [database, galleryId]);

  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['memberships', galleryId],
    queryFn: async () => {
      if (!galleryId || !user?.id) return { members: [] };
      const remoteData = await getMembers(galleryId);
      await syncMembers(database, galleryId, remoteData.members, user.id);
      return remoteData;
    },
    enabled: !!galleryId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    members,
    // Keep acceptedMembers as an alias so screens don't need to be updated
    acceptedMembers: members,
    isLoading: isLoading && members.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

export const useJoinGallery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryId: string) => joinGallery(galleryId),
    onSuccess: (data, galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

export const useLeaveGallery = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (galleryId: string) => leaveGallery(galleryId),
    onMutate: async (galleryId) => {
      if (user?.id) {
        await removeMembershipLocally(database, galleryId, user.id);
      }
    },
    onSuccess: (data, galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
    onError: (error, galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    }
  });
};

export const useAddGalleryMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => addMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

export const usePromoteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => promoteMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

export const useDenyOrRemoveMember = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();

  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => removeMember(galleryId, userId),
    onMutate: async ({ galleryId, userId }) => {
      await removeMembershipLocally(database, galleryId, userId);
    },
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
    onError: (error, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    }
  });
};

export const useUpdateMyMembership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, isMuted }: { galleryId: string; isMuted: boolean }) =>
      updateMyMembership(galleryId, { isMuted }),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

export const useMyMembership = (galleryId: string | null) => {
  const database = useDatabase();
  const { user } = useAuth();
  const [localMembership, setLocalMembership] = useState<Membership | null>(null);

  useEffect(() => {
    if (!galleryId || !user?.id) {
      setLocalMembership(null);
      return;
    }
    const col = database.collections.get<Membership>('memberships');
    const sub = col
      .query(Q.where('gallery_id', galleryId), Q.where('user_id', user.id))
      .observe()
      .subscribe(records => setLocalMembership(records[0] ?? null));
    return () => sub.unsubscribe();
  }, [database, galleryId, user?.id]);

  const query = useQuery({
    queryKey: ['myMembership', galleryId],
    enabled: !!galleryId,
    queryFn: async () => {
      const apiMembership = await getMyMembership(galleryId as string);
      const col = database.collections.get<Membership>('memberships');
      const existing = await col
        .query(Q.where('gallery_id', galleryId), Q.where('user_id', apiMembership.userId))
        .fetch();
      await database.write(async () => {
        if (existing.length > 0) {
          await database.batch(
            existing[0].prepareUpdate(record => {
              record.role = apiMembership.role;
              record.isMuted = apiMembership.isMuted;
            })
          );
        } else {
          await database.batch(
            col.prepareCreate(record => {
              record._raw.id = apiMembership.id;
              record.galleryId = apiMembership.galleryId;
              record.userId = apiMembership.userId;
              record.joinedAt = new Date(apiMembership.joinedAt).getTime();
              record.role = apiMembership.role;
              record.isMuted = apiMembership.isMuted;
            })
          );
        }
      });
      return apiMembership;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: (query.data ?? localMembership) as typeof query.data,
  };
};

export const useAddCommunityMembersToGallery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, groupId }: { galleryId: string; groupId: string }) =>
      addCommunityMembersToGallery(galleryId, groupId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};
