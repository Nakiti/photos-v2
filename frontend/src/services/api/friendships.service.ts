import apiClient from "../apiClient";

export interface FriendshipApi {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
  otherUser?: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}

export interface FriendshipsGroupedResponse {
  friendships: FriendshipApi[];
  pendingIncoming: FriendshipApi[];
  pendingOutgoing: FriendshipApi[];
}

export const getFriendships = async (): Promise<FriendshipsGroupedResponse> => {
  const response = await apiClient.get('/api/v1/friendships');
  return response.data as FriendshipsGroupedResponse;
};

export const sendFriendRequest = async (
  receiverId: string
): Promise<FriendshipApi> => {
  const response = await apiClient.post('/api/v1/friendships/requests', { receiverId });
  return response.data as FriendshipApi;
};

export const acceptFriendRequest = async (
  requesterId: string
): Promise<FriendshipApi> => {
  const response = await apiClient.put(`/api/v1/friendships/requests/${requesterId}/accept`);
  return response.data as FriendshipApi;
};

export const cancelOrRejectFriendRequest = async (
  otherUserId: string
): Promise<void> => {
  await apiClient.delete(`/api/v1/friendships/requests/${otherUserId}`);
};

export const removeFriend = async (friendUserId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/friendships/friends/${friendUserId}`);
};
