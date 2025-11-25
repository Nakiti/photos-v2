import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CommunityMembership from '../db/models/CommunityMembership';
import User from '../db/models/User';
import { useAuth } from './useAuth';
import {
  addMember as addCommunityMember,
  removeMember as removeCommunityMember,
  getMembers as getCommunityMembers,
  promoteMember as promoteCommunityMember,
  getMyMembership as getMyCommunityMembership,
} from '../services/api/communityMemberships.service';
import { removeCommunityMembershipLocally, syncCommunityMembers } from '../services/sync/communityMemberships.sync';

export interface EnrichedCommunityMembership {
  membership: CommunityMembership;
  user: User;
}

export const useCommunityMembers = (communityId: string | null) => {
  const database = useDatabase();
  const [members, setMembers] = useState<EnrichedCommunityMembership[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Observe local memberships and users
  useEffect(() => {
    if (!communityId) {
      setMembers([]);
      return;
    }
    const membershipsCollection = database.collections.get<CommunityMembership>('community_memberships');
    const usersCollection = database.collections.get<User>('users');

    const query = membershipsCollection.query(Q.where('community_id', communityId));
    const subscription = query.observeWithColumns(['user_id', 'role']).subscribe(async (memberships) => {
      if (memberships.length === 0) {
        setMembers([]);
        return;
      }
      try {
        const userIds = [...new Set(memberships.map((m) => m.userId))];
        const users = await usersCollection.query(Q.where('id', Q.oneOf(userIds))).fetch();
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enriched: EnrichedCommunityMembership[] = [];
        for (const membership of memberships) {
          const found = userMap.get(membership.userId);
          if (found) {
            enriched.push({ membership, user: found });
          }
        }
        setMembers(enriched);
      } catch (e) {
        console.error('Error enriching community memberships:', e);
        setMembers([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [database, communityId]);

  // Fetch + sync from server
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['community-members', communityId],
    enabled: !!communityId && !!user?.id,
    queryFn: async () => {
      if (!communityId || !user?.id) return { members: [] };
      const remote = await getCommunityMembers(communityId);
      await syncCommunityMembers(database, communityId, remote.members, user.id);
      return remote;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    members,
    isLoading: isLoading && members.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

// Admin mutations
export const useAddCommunityMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      addCommunityMember(communityId, userId),
    onSuccess: (data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
  });
};

export const usePromoteCommunityMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      promoteCommunityMember(communityId, userId),
    onSuccess: (data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
  });
};

export const useRemoveCommunityMember = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      removeCommunityMember(communityId, userId),
    onMutate: async ({ communityId, userId }) => {
      await removeCommunityMembershipLocally(database, communityId, userId);
    },
    onSuccess: (data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
    onError: (err, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
  });
};

// My membership
export const useMyCommunityMembership = (communityId: string | null) => {
  return useQuery({
    queryKey: ['my-community-membership', communityId],
    enabled: !!communityId,
    queryFn: () => getMyCommunityMembership(communityId as string),
    staleTime: 5 * 60 * 1000,
  });
};


