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
  acceptInvite,
  leaveGallery,
  inviteMember,
  promoteMember,
  approveMember,
  updateMyMembership,
  getMyMembership

} from "../services/api/memberships.service"; // Assuming a dedicated memberService
import { syncMembers, removeMembershipLocally } from "../services/sync/memberships.sync";
import { useAuth } from "./useAuth";


export interface EnrichedMembership {
  membership: Membership;
  user: User;
}

// Enum for membership status (should match backend)
export enum MembershipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  INVITED = 'INVITED',
  BLOCKED = 'BLOCKED',
}

export enum MembershipRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

/**
 * Hook to get live-updating lists of members for a gallery, categorized by status.
 */
export const useMemberships = (galleryId: string | null) => {
  const database = useDatabase();
  const [acceptedMembers, setAcceptedMembers] = useState<EnrichedMembership[]>([]);
  const [pendingMembers, setPendingMembers] = useState<EnrichedMembership[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Assuming `user` has an `id` property

  // 1. OBSERVE LOCAL DATA (FIXED for performance)
  useEffect(() => {
    if (!galleryId) {
      setAcceptedMembers([]);
      setPendingMembers([]);
      return;
    }

    const membershipsCollection =
      database.collections.get<Membership>('memberships');
    const usersCollection = database.collections.get<User>('users');

    const query = membershipsCollection.query(
      Q.where('gallery_id', galleryId),
      Q.where(
        'status',
        Q.oneOf([MembershipStatus.ACCEPTED, MembershipStatus.PENDING]),
      ),
    );

    const subscription = query
      .observeWithColumns(['user_id', 'status', 'role'])
      .subscribe(async (memberships) => {
        if (memberships.length === 0) {
          setAcceptedMembers([]);
          setPendingMembers([]);
          return;
        }

        try {
          // --- Performance Fix: Start ---
          // 1. Get all unique user IDs
          const userIds = [...new Set(memberships.map((m) => m.userId))];

          // 2. Fetch all users in a single batch query
          const users = await usersCollection
            .query(Q.where('id', Q.oneOf(userIds)))
            .fetch();

          // 3. Create a Map for fast lookups
          const userMap = new Map(users.map((u) => [u.id, u]));
          // --- Performance Fix: End ---

          const accepted: EnrichedMembership[] = [];
          const pending: EnrichedMembership[] = [];

          for (const membership of memberships) {
            const user = userMap.get(membership.userId); // Get user from Map

            if (user) {
              const enriched = { membership, user };
              if (membership.status === MembershipStatus.ACCEPTED) {
                accepted.push(enriched);
              } else if (membership.status === MembershipStatus.PENDING) {
                pending.push(enriched);
              }
            } else {
              console.warn(
                `Could not find user ${membership.userId} locally for gallery ${galleryId}. Waiting for sync.`,
              );

            }
          }

          setAcceptedMembers(accepted);
          setPendingMembers(pending);
        } catch (error) {
          console.error('Error enriching memberships:', error);
          setAcceptedMembers([]);
          setPendingMembers([]);
        }
      });

    return () => subscription.unsubscribe();
  }, [database, galleryId]); 

  // 2. FETCH & SYNC REMOTE DATA (FIXED for sync bug)
  const { isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['memberships', galleryId],
    queryFn: async () => {
      if (!galleryId || !user?.id) return { members: [], pending: [] };

      // 1. Fetch from API
      const remoteData = await getMembers(galleryId);

      // 2. Combine all remote members into ONE list
      const allRemoteMembers = [
        ...remoteData.members,
        ...remoteData.pending,
        // Add other lists if your API has them (e.g., remoteData.invited)
      ];

      // 3. Call syncMembers ONCE with the complete list
      await syncMembers(database, galleryId, allRemoteMembers, user.id);

      return remoteData;
    },
    enabled: !!galleryId && !!user?.id, // Only run if we have both IDs
    staleTime: 5 * 60 * 1000,
  });

  return {
    acceptedMembers,
    pendingMembers,
    isLoading: isLoading && acceptedMembers.length === 0 && pendingMembers.length === 0,
    isSyncing: isFetching,
    isError,
    error,
  };
};

// --- USER-FACING MUTATIONS ---

/**
 * Hook for a user to request to join a private gallery.
 */
export const useRequestToJoinGallery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryId: string) => joinGallery(galleryId),
    onSuccess: (data, galleryId) => {
      // Invalidate to show the new "PENDING" status
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for a user to accept an invite.
 */
export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryId: string) => acceptInvite(galleryId),
    onSuccess: (data, galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for the current user to leave a gallery.
 */
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
      queryClient.invalidateQueries({ queryKey: ['galleries'] }); // Invalidate main list
    },
    onError: (error, galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    }
  });
};


// --- ADMIN-FACING MUTATIONS ---

/**
 * Hook for an Admin to invite a user to a gallery.
 */
export const useInviteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => inviteMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for an Admin to approve a pending join request.
 */
export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => approveMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for an Admin to promote a member to an admin.
 */
export const usePromoteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => promoteMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for an Admin to deny a request or remove (kick) an existing member.
 */
export const useDenyOrRemoveMember = () => {  
  const queryClient = useQueryClient();
  const database = useDatabase();
  
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => removeMember(galleryId, userId),
    onMutate: async ({ galleryId, userId }) => {
      // Optimistic update to remove the member from the UI instantly
      await removeMembershipLocally(database, galleryId, userId);
    },
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
    onError: (error, { galleryId }) => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    }
  });
};

/**
 * Hook for the current user to update their membership preferences (e.g., mute notifications).
 */
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


/**
 * Hook to get the current user's membership for a specific gallery.
 */
export const useMyMembership = (galleryId: string | null) => {
  return useQuery({
    queryKey: ['myMembership', galleryId],
    enabled: !!galleryId,
    queryFn: () => getMyMembership(galleryId as string),
    staleTime: 5 * 60 * 1000,
  });
};

