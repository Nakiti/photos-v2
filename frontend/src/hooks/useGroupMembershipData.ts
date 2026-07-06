import { useDatabase } from '@nozbe/watermelondb/react';
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import GroupMembership from '../db/models/GroupMembership';
import User from '../db/models/User';
import { useAuth } from './useAuth';
import {
  addMember as addGroupMember,
  removeMember as removeGroupMember,
  getMembers as getGroupMembers,
  promoteMember as promoteGroupMember,
  getMyMembership as getMyGroupMembership,
} from '../services/api/groupMemberships.service';
import { removeGroupMembershipLocally, syncGroupMembers } from '../services/sync/groupMemberships.sync';

export interface EnrichedGroupMembership {
  membership: GroupMembership;
  user: User;
}

export const useGroupMembers = (groupId: string | null) => {
  const database = useDatabase();
  const [members, setMembers] = useState<EnrichedGroupMembership[]>([]);
  const { user } = useAuth();

  // Observe local memberships and users
  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    const membershipsCollection = database.collections.get<GroupMembership>('community_memberships');
    const usersCollection = database.collections.get<User>('users');

    const query = membershipsCollection.query(Q.where('community_id', groupId));
    const subscription = query.observeWithColumns(['user_id', 'role']).subscribe(async (memberships) => {
      if (memberships.length === 0) {
        setMembers([]);
        return;
      }
      try {
        const userIds = [...new Set(memberships.map((m) => m.userId))];
        const users = await usersCollection.query(Q.where('id', Q.oneOf(userIds))).fetch();
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enriched: EnrichedGroupMembership[] = [];
        for (const membership of memberships) {
          const found = userMap.get(membership.userId);
          if (found) {
            enriched.push({ membership, user: found });
          }
        }
        setMembers(enriched);
      } catch (e) {
        console.error('Error enriching group memberships:', e);
        setMembers([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [database, groupId]);

  // Fetch + sync from server
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId && !!user?.id,
    queryFn: async () => {
      if (!groupId || !user?.id) return { members: [] };
      const remote = await getGroupMembers(groupId);
      await syncGroupMembers(database, groupId, remote.members);
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
export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      addGroupMember(groupId, userId),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
};

export const usePromoteGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      promoteGroupMember(groupId, userId),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      removeGroupMember(groupId, userId),
    onMutate: async ({ groupId, userId }) => {
      await removeGroupMembershipLocally(database, groupId, userId);
    },
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
    onError: (err, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
};

// My membership
export const useMyGroupMembership = (groupId: string | null) => {
  return useQuery({
    queryKey: ['my-group-membership', groupId],
    enabled: !!groupId,
    queryFn: () => getMyGroupMembership(groupId as string),
    staleTime: 5 * 60 * 1000,
  });
};
