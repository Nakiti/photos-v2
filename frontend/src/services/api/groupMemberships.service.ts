import apiClient from '../apiClient';

export type GroupRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  user: {
    id: string;
    name?: string;
    avatarUrl?: string;
    handle?: string;
  };
  membership: {
    id: string;
    joinedAt: string;
    role: GroupRole;
    status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED';
  };
}

export interface MyGroupMembership {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: string;
  role: GroupRole;
}

export const getMembers = async (groupId: string, status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED'): Promise<{ members: GroupMember[]; pending?: GroupMember[] }> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiClient.get(`/api/v1/communities/${groupId}/members${query}`);
  return response.data as { members: GroupMember[]; pending?: GroupMember[] };
};

export const addMember = async (groupId: string, userId: string) => {
  const response = await apiClient.post(`/api/v1/communities/${groupId}/members`, { userId });
  return response.data;
};

export const removeMember = async (groupId: string, userId: string) => {
  const response = await apiClient.delete(`/api/v1/communities/${groupId}/members/${userId}`);
  return response.data;
};

export const promoteMember = async (groupId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/communities/${groupId}/members/${userId}/promote`);
  return response.data;
};

export const getMyMembership = async (groupId: string): Promise<MyGroupMembership> => {
  const response = await apiClient.get(`/api/v1/communities/${groupId}/members/me`);
  return response.data as MyGroupMembership;
};

export const approveMember = async (groupId: string, userId: string) => {
  const response = await apiClient.put(`/api/v1/communities/${groupId}/members/${userId}/approve`);
  return response.data;
};
