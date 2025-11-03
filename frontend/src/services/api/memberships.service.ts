import apiClient from "../apiClient";

export type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';

export const getMembers = async (galleryId: string, status?: MembershipStatus) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members${query}`);
  console.log("memebrs ", response.data)
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

// User actions on own membership
export const joinGallery = async (galleryId: string) => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/join`);
  return response.data;
};

export const acceptInvite = async (galleryId: string) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/invites/accept`);
  return response.data;
};

export const leaveGallery = async (galleryId: string) => {
  const response = await apiClient.delete(`/api/v1/galleries/${galleryId}/leave`);
  return response.data;
};

// Admin actions
export const inviteMember = async (galleryId: string, userIdToInvite: string) => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/invites`, { userIdToInvite });
  return response.data;
};

export const promoteMember = async (galleryId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/members/${userId}/promote`);
  return response.data;
};

export const approveMember = async (galleryId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/members/${userId}/approve`);
  return response.data;
};

// Current user updates their own membership
export const updateMyMembership = async (
  galleryId: string,
  data: { isMuted: boolean }
) => {
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}/members/me`, data);
  return response.data;
};

// Current user's membership for a gallery
export type MyMembership = {
  id: string;
  userId: string;
  galleryId: string;
  joinedAt: string;
  status: MembershipStatus;
  role: 'ADMIN' | 'MEMBER';
  isMuted: boolean;
};

export const getMyMembership = async (galleryId: string): Promise<MyMembership> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members/me`);
  return response.data;
};