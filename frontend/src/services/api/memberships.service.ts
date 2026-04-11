import apiClient from "../apiClient";

export const getMembers = async (galleryId: string) => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members`);
  return response.data;
};

export const addMember = async (galleryId: string, userId: string) => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/members`, { userId });
  return response.data;
};

export const removeMember = async (galleryId: string, userId: string) => {
  const response = await apiClient.delete(`/api/v1/galleries/${galleryId}/members/${userId}`);
  return response.data;
};

export const getMemberSync = async (galleryId: string) => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members/sync`);
  return response.data;
};

export const joinGallery = async (galleryId: string) => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/join`);
  return response.data;
};

export const leaveGallery = async (galleryId: string) => {
  const response = await apiClient.delete(`/api/v1/galleries/${galleryId}/leave`);
  return response.data;
};

export const promoteMember = async (galleryId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/members/${userId}/promote`);
  return response.data;
};

export const updateMyMembership = async (
  galleryId: string,
  data: { isMuted: boolean }
) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/members/me`, data);
  return response.data;
};

export type MyMembership = {
  id: string;
  userId: string;
  galleryId: string;
  joinedAt: string;
  role: 'ADMIN' | 'MEMBER';
  isMuted: boolean;
};

export const getMyMembership = async (galleryId: string): Promise<MyMembership> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members/me`);
  return response.data;
};

export interface AddCommunityMembersResponse {
  addedCount: number;
  errors: any[];
  message: string;
}

export const addCommunityMembersToGallery = async (
  galleryId: string,
  communityId: string
): Promise<AddCommunityMembersResponse> => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/members/bulk`, {
    communityId,
  });
  return response.data;
};
