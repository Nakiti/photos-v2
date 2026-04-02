import { useDatabase } from "@nozbe/watermelondb/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Q, Database } from "@nozbe/watermelondb";
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
  getMyMembership,
  addCommunityMembersToGallery,

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
        Q.oneOf([MembershipStatus.ACCEPTED, MembershipStatus.PENDING, MembershipStatus.INVITED]),
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
              } else if (
                membership.status === MembershipStatus.PENDING ||
                membership.status === MembershipStatus.INVITED
              ) {
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
 * Hook for an Admin to add a member directly to a gallery.
 */
export const useAddGalleryMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => addMember(galleryId, userId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

/**
 * Hook for an Admin to invite a user to a gallery.
 */
export const useInviteMember = () => {
  const queryClient = useQueryClient();
  const database = useDatabase();
  return useMutation<any, unknown, { galleryId: string; userId: string; user?: { id: string; name?: string; handle: string; avatarUrl?: string } }>({
    mutationFn: ({ galleryId, userId }: { galleryId: string; userId: string }) => inviteMember(galleryId, userId),
    // Optimistically insert/update the invited user as PENDING locally for instant UI
    onMutate: async ({ galleryId, userId, user }: { galleryId: string; userId: string; user?: { id: string; name?: string; handle: string; avatarUrl?: string } }) => {
      try {
        await database.write(async () => {
          const usersCollection = database.collections.get<User>('users');
          const membershipsCollection = database.collections.get<Membership>('memberships');

          // Upsert user (if provided)
          if (user && user.id) {
            let existingUser: User | null = null;
            try {
              existingUser = await usersCollection.find(user.id);
            } catch {
              existingUser = null;
            }

            if (existingUser) {
              await existingUser.update((record) => {
                // Use same property names as sync to stay consistent
                (record as any).name = user.name || user.handle;
                (record as any).avatar_url = user.avatarUrl;
                (record as any).handle = user.handle;
              });
            } else {
              await usersCollection.create((record) => {
                (record as any)._raw.id = user.id;
                (record as any).name = user.name || user.handle;
                (record as any).avatar_url = user.avatarUrl;
                (record as any).handle = user.handle;
              });
            }
          }

          // Upsert membership as PENDING
          const existing = await membershipsCollection
            .query(
              Q.where('gallery_id', galleryId),
              Q.where('user_id', userId),
            )
            .fetch();

          if (existing.length > 0) {
            await existing[0].update((record) => {
              record.status = 'INVITED';
              record.role = 'MEMBER';
              record.isMuted = false;
            });
          } else {
            await membershipsCollection.create((record) => {
              record._raw.id = `optimistic-${galleryId}-${userId}`;
              record.galleryId = galleryId;
              record.userId = userId;
              record.joinedAt = Date.now();
              record.status = 'INVITED';
              record.role = 'MEMBER';
              record.isMuted = false;
            });
          }
        });
      } catch (e) {
        // Best-effort optimistic update; fall back to server invalidate
        console.warn('Optimistic invite failed:', e);
      }
    },
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
 * Observes local DB for offline support and syncs from the API in the background.
 */
export const useMyMembership = (galleryId: string | null) => {
  const database = useDatabase();
  const { user } = useAuth();
  const [localMembership, setLocalMembership] = useState<Membership | null>(null);

  // Observe local record so role/status are available offline
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
      // Persist to local DB so offline reads always have up-to-date role/status
      const col = database.collections.get<Membership>('memberships');
      const existing = await col
        .query(Q.where('gallery_id', galleryId), Q.where('user_id', apiMembership.userId))
        .fetch();
      await database.write(async () => {
        if (existing.length > 0) {
          await database.batch(
            existing[0].prepareUpdate(record => {
              record.role = apiMembership.role;
              record.status = apiMembership.status;
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
              record.status = apiMembership.status;
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
    // Use API data when fresh, fall back to local DB record when offline
    data: (query.data ?? localMembership) as typeof query.data,
  };
};

/**
 * Hook to bulk add all members from a community to a gallery.
 * This is more efficient than adding members one by one.
 */
export const useAddCommunityMembersToGallery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryId, communityId }: { galleryId: string; communityId: string }) =>
      addCommunityMembersToGallery(galleryId, communityId),
    onSuccess: (data, { galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberships', galleryId] });
    },
  });
};

