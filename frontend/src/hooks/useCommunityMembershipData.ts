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
  approveMember as approveCommunityMember,
} from '../services/api/communityMemberships.service';
import { removeCommunityMembershipLocally, syncCommunityMembers } from '../services/sync/communityMemberships.sync';

export interface EnrichedCommunityMembership {
  membership: CommunityMembership;
  user: User;
}

export const useCommunityMembers = (communityId: string | null) => {
  const database = useDatabase();
  const [members, setMembers] = useState<EnrichedCommunityMembership[]>([]);
  const [pendingMembers, setPendingMembers] = useState<EnrichedCommunityMembership[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Observe local memberships and users
  useEffect(() => {
    if (!communityId) {
      setMembers([]);
      setPendingMembers([]);
      return;
    }
    const membershipsCollection = database.collections.get<CommunityMembership>('community_memberships');
    const usersCollection = database.collections.get<User>('users');

    const query = membershipsCollection.query(Q.where('community_id', communityId));
    const subscription = query.observeWithColumns(['user_id', 'role', 'status']).subscribe(async (memberships) => {
      if (memberships.length === 0) {
        setMembers([]);
        setPendingMembers([]);
        return;
      }
      try {
        const userIds = [...new Set(memberships.map((m) => m.userId))];
        const users = await usersCollection.query(Q.where('id', Q.oneOf(userIds))).fetch();
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enriched: EnrichedCommunityMembership[] = [];
        const pending: EnrichedCommunityMembership[] = [];
        for (const membership of memberships) {
          const found = userMap.get(membership.userId);
          if (found) {
            const enrichedItem = { membership, user: found };
            enriched.push(enrichedItem);
            // Check if status is PENDING or INVITED (if status field exists)
            const status = (membership as any).status;
            if (status === 'PENDING' || status === 'INVITED') {
              pending.push(enrichedItem);
            }
          }
        }
        setMembers(enriched);
        setPendingMembers(pending);
      } catch (e) {
        console.error('Error enriching community memberships:', e);
        setMembers([]);
        setPendingMembers([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [database, communityId]);

  // Fetch + sync from server
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['community-members', communityId],
    enabled: !!communityId && !!user?.id,
    queryFn: async () => {
      if (!communityId || !user?.id) return { members: [], pending: [] };
      const remote = await getCommunityMembers(communityId);
      await syncCommunityMembers(database, communityId, remote.members, user.id);
      return remote;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    members,
    pendingMembers,
    isLoading: isLoading && members.length === 0 && pendingMembers.length === 0,
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

/**
 * Hook for an Admin to approve a pending join request.
 */
export const useApproveCommunityJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      approveCommunityMember(communityId, userId),
    onSuccess: (data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    },
  });
};


