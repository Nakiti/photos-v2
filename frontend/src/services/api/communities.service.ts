import apiClient from '../apiClient';

export interface CommunityApiResponse {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  ownerId: string;
  joinRequiresApproval?: boolean;
  addPermission?: 'ANYONE' | 'ADMIN';
  deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
  memberCount: number;
  galleryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  iconUrl?: string | null;
  wantsIconUpload?: boolean;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  iconUrl?: string;
  joinRequiresApproval?: boolean;
  addPermission?: 'ANYONE' | 'ADMIN';
  deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
}

export interface MyCommunitiesResponse {
  owned: CommunityApiResponse[];
  memberships: CommunityApiResponse[];
}

export const fetchMyCommunities = async (): Promise<MyCommunitiesResponse> => {
  const response = await apiClient.get('/api/v1/communities');
  return response.data as MyCommunitiesResponse;
};

export const createCommunity = async (
  data: CreateCommunityRequest
): Promise<{ community: CommunityApiResponse; uploadInfo?: { presignedUrl: string; finalUrl: string } }> => {
  const response = await apiClient.post('/api/v1/communities', data);
  return response.data;
};

export const getCommunityDetails = async (communityId: string): Promise<CommunityApiResponse> => {
  const response = await apiClient.get(`/api/v1/communities/${communityId}`);
  return response.data as CommunityApiResponse;
};

export const updateCommunity = async (
  communityId: string,
  data: UpdateCommunityRequest
): Promise<CommunityApiResponse> => {
  const response = await apiClient.put(`/api/v1/communities/${communityId}`, data);
  return response.data as CommunityApiResponse;
};

export const deleteCommunity = async (communityId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/communities/${communityId}`);
};

export const requestCommunityIconPresign = async (
  communityId: string,
  contentType: string,
  fileExtension: string
): Promise<{ presignedUrl: string; finalUrl: string }> => {
  const response = await apiClient.post(`/api/v1/communities/${communityId}/icon/presign`, {
    contentType,
    fileExtension,
  });
  return response.data;
};

export const getCommunityShareLink = async (communityId: string): Promise<string> => {
  const response = await apiClient.get(`/api/v1/communities/${communityId}/share-link`);
  return response.data.shareLink as string;
};

export const joinCommunity = async (communityId: string) => {
  const response = await apiClient.post(`/api/v1/communities/${communityId}/join`);
  return response.data;
};

export const leaveCommunity = async (communityId: string) => {
  const response = await apiClient.delete(`/api/v1/communities/${communityId}/leave`);
  return response.data;
};

export const transferOwnership = async (
  communityId: string,
  newOwnerId: string
): Promise<CommunityApiResponse> => {
  const response = await apiClient.put(`/api/v1/communities/${communityId}/transfer-ownership`, {
    newOwnerId,
  });
  return response.data as CommunityApiResponse;
};


