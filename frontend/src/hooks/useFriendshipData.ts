import { useDatabase } from "@nozbe/watermelondb/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Q } from "@nozbe/watermelondb";
import Friendship from '../db/models/Friendship';
import User from '../db/models/User';
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { getFriendships, sendFriendRequest, acceptFriendRequest, removeFriend, cancelOrRejectFriendRequest} from "../services/api/friendships.service";
import { syncFriendships } from "../services/sync/friendships.sync";
import { useMutation } from "@tanstack/react-query";

export interface EnrichedFriendship {
    friendship: Friendship;
    // Depending on the context, you might want requester or receiver profile
    friendProfile: User;
}

// Enum for friendship status (should match backend)
export enum FriendshipStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    BLOCKED = 'BLOCKED', // Optional: Add if needed
}
  
/**
 * Hook to get a live-updating list of friendships (accepted, pending incoming/outgoing).
 * Observes local DB and syncs with the server in the background.
 */
export const useFriendships = () => {
    const database = useDatabase();
    const { user: currentUser } = useAuth(); // Get the current user
    // Separate states for different lists
    const [friends, setFriends] = useState<EnrichedFriendship[]>([]);
    const [pendingIncoming, setPendingIncoming] = useState<EnrichedFriendship[]>([]);
    const [pendingOutgoing, setPendingOutgoing] = useState<EnrichedFriendship[]>([]);
    const queryClient = useQueryClient();

    // Observe local data and categorize friendships
    useEffect(() => {
        if (!currentUser?.id) return; // Need current user ID

        const friendshipsCollection = database.collections.get<Friendship>('friendships');
        // Query for all friendships involving the current user
        const query = friendshipsCollection.query(
        Q.or(
            Q.where('requester_id', currentUser.id),
            Q.where('receiver_id', currentUser.id)
        ),
        Q.where('status', Q.notEq(FriendshipStatus.BLOCKED)) // Example: exclude blocked users
        );

        const subscription = query.observeWithColumns(['requester_id', 'receiver_id', 'status']).subscribe(async (friendships) => {
        const accepted: EnrichedFriendship[] = [];
        const incoming: EnrichedFriendship[] = [];
        const outgoing: EnrichedFriendship[] = [];

        try {
            await Promise.all(
            friendships.map(async (friendship) => {
                let friendUserId: string | null = null;
                if (friendship.requesterId === currentUser.id) {
                friendUserId = friendship.receiverId;
                } else if (friendship.receiverId === currentUser.id) {
                friendUserId = friendship.requesterId;
                }

                if (friendUserId) {
                try {
                    // Fetch the profile of the *other* user in the friendship
                    const friendProfile = await database.collections.get<User>('users').find(friendUserId);
                    const enriched: EnrichedFriendship = { friendship, friendProfile };

                    // Categorize based on status and direction
                    if (friendship.status === FriendshipStatus.ACCEPTED) {
                    accepted.push(enriched);
                    } else if (friendship.status === FriendshipStatus.PENDING) {
                    if (friendship.receiverId === currentUser.id) {
                        incoming.push(enriched); // Request sent TO me
                    } else {
                        outgoing.push(enriched); // Request sent BY me
                    }
                    }
                } catch (userFetchError) {
                    console.warn(`Could not fetch user profile ${friendUserId} for friendship ${friendship.id}`, userFetchError);
                    queryClient.invalidateQueries({ queryKey: ['friendships'] });
                }
                }
            })
            );
        } catch (error) {
            console.error("Error enriching friendships:", error);
        }

        setFriends(accepted);
        setPendingIncoming(incoming);
        setPendingOutgoing(outgoing);
        });

        return () => subscription.unsubscribe();
    }, [database, currentUser, queryClient]);


    // Fetch & Sync remote data
    const { isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['friendships'], // Single query key for all friendships
        queryFn: async () => {
        const remoteFriendships = await getFriendships();
        // Full reconciliation sync
        await syncFriendships(database, remoteFriendships);
        return remoteFriendships;
        },
        staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
    });

    return {
        friends,            // List of accepted friends
        pendingIncoming,    // List of pending requests sent TO the user
        pendingOutgoing,    // List of pending requests sent BY the user
        isLoading: isLoading && friends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0,
        isSyncing: isFetching,
        isError,
        error,
    };
};
  
/**
 * Hook to send a friend request.
 */
export const useSendFriendRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userIdToSendRequestTo: string) => sendFriendRequest(userIdToSendRequestTo),
        onSuccess: () => {
        // Invalidate the main friendships query to refetch everything
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        },
        onError: (error) => {
        console.error("Failed to send friend request:", error);
        // Show error feedback
        },
    });
};
  
  /**
   * Hook to accept a friend request.
   */
  export const useAcceptFriendRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (requesterId: string) => acceptFriendRequest(requesterId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
      },
      onError: (error) => {
        console.error("Failed to accept friend request:", error);
        // Show error feedback
      },
    });
  };
  
/**
 * Hook to reject or cancel a friend request.
 */
export const useRejectFriendRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // API needs to know if we are rejecting an incoming request (otherUserId is requester)
        // or cancelling an outgoing request (otherUserId is receiver)
        mutationFn: (otherUserId: string) => cancelOrRejectFriendRequest(otherUserId),
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        },
        onError: (error) => {
        console.error("Failed to reject/cancel friend request:", error);
        // Show error feedback
        },
    });
};
  
/**
 * Hook to remove an existing friend.
 */
export const useRemoveFriend = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (friendUserIdToRemove: string) => removeFriend(friendUserIdToRemove),
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['friendships'] });
        },
        onError: (error) => {
        console.error("Failed to remove friend:", error);
        // Show error feedback
        },
    });
};
  