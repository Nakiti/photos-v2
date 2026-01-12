import apiClient from '../apiClient';

export type CommunityRole = 'ADMIN' | 'MEMBER';

export interface CommunityMember {
  user: {
    id: string;
    name?: string;
    avatarUrl?: string;
    handle?: string;
  };
  membership: {
    id: string;
    joinedAt: string;
    role: CommunityRole;
    status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';
  };
}

export interface MyCommunityMembership {
  id: string;
  userId: string;
  communityId: string;
  joinedAt: string;
  role: CommunityRole;
}

export const getMembers = async (communityId: string, status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'): Promise<{ members: CommunityMember[]; pending?: CommunityMember[] }> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiClient.get(`/api/v1/communities/${communityId}/members${query}`);
  return response.data as { members: CommunityMember[]; pending?: CommunityMember[] };
};

export const addMember = async (communityId: string, userId: string) => {
  const response = await apiClient.post(`/api/v1/communities/${communityId}/members`, { userId });
  return response.data;
};

export const removeMember = async (communityId: string, userId: string) => {
  const response = await apiClient.delete(`/api/v1/communities/${communityId}/members/${userId}`);
  return response.data;
};

export const promoteMember = async (communityId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/communities/${communityId}/members/${userId}/promote`);
  return response.data;
};

export const getMyMembership = async (communityId: string): Promise<MyCommunityMembership> => {
  const response = await apiClient.get(`/api/v1/communities/${communityId}/members/me`);
  return response.data as MyCommunityMembership;
};

export const approveMember = async (communityId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/communities/${communityId}/members/${userId}/approve`);
  return response.data;
};


