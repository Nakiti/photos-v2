import apiClient from '../apiClient';

export interface GroupApiResponse {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  ownerId: string;
  addPermission?: 'ANYONE' | 'ADMIN';
  deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
  memberCount: number;
  galleryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  iconUrl?: string | null;
  wantsIconUpload?: boolean;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  iconUrl?: string;
  addPermission?: 'ANYONE' | 'ADMIN';
  deletePermission?: 'ADMINS_AUTHORS' | 'ADMIN';
}

export interface MyGroupsResponse {
  owned: GroupApiResponse[];
  memberships: GroupApiResponse[];
}

export const fetchMyGroups = async (): Promise<MyGroupsResponse> => {
  const response = await apiClient.get('/api/v1/communities');
  return response.data as MyGroupsResponse;
};

export const createGroup = async (
  data: CreateGroupRequest
): Promise<{ community: GroupApiResponse; uploadInfo?: { presignedUrl: string; finalUrl: string } }> => {
  const response = await apiClient.post('/api/v1/communities', data);
  return response.data;
};

export const getGroupDetails = async (groupId: string): Promise<GroupApiResponse> => {
  const response = await apiClient.get(`/api/v1/communities/${groupId}`);
  return response.data as GroupApiResponse;
};

export const updateGroup = async (
  groupId: string,
  data: UpdateGroupRequest
): Promise<GroupApiResponse> => {
  const response = await apiClient.put(`/api/v1/communities/${groupId}`, data);
  return response.data as GroupApiResponse;
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/communities/${groupId}`);
};

export const requestGroupIconPresign = async (
  groupId: string,
  contentType: string,
  fileExtension: string
): Promise<{ presignedUrl: string; finalUrl: string }> => {
  const response = await apiClient.post(`/api/v1/communities/${groupId}/icon/presign`, {
    contentType,
    fileExtension,
  });
  return response.data;
};

export const getGroupShareLink = async (groupId: string): Promise<string> => {
  const response = await apiClient.get(`/api/v1/communities/${groupId}/share-link`);
  return response.data.shareLink as string;
};

export const joinGroup = async (groupId: string) => {
  const response = await apiClient.post(`/api/v1/communities/${groupId}/join`);
  return response.data;
};

export const leaveGroup = async (groupId: string) => {
  const response = await apiClient.delete(`/api/v1/communities/${groupId}/leave`);
  return response.data;
};

export const transferOwnership = async (
  groupId: string,
  newOwnerId: string
): Promise<GroupApiResponse> => {
  const response = await apiClient.put(`/api/v1/communities/${groupId}/transfer-ownership`, {
    newOwnerId,
  });
  return response.data as GroupApiResponse;
};
