import apiClient from '../apiClient';
import { User } from '../../types';

export interface UserProfile extends User {
  avatarUrl?: string;
  handle: string;
}

export interface UpdateMyProfileRequest {
  name?: string;
  avatarUrl?: string;
}

export interface RegisterDeviceRequest {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * Fetch the current authenticated user's profile.
 *
 * @returns Promise resolving to the user's profile
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/api/v1/users/me');
  return response.data as UserProfile;
};

/**
 * Update the authenticated user's profile fields.
 *
 * @param data Fields to update (name, avatarUrl)
 * @returns Promise resolving to the updated profile
 */
export const updateMyProfile = async (data: UpdateMyProfileRequest): Promise<UserProfile> => {
  const response = await apiClient.put('/api/v1/users/me', data);
  return response.data as UserProfile;
};

/**
 * Register a device token for push notifications.
 *
 * @param req Device token registration payload
 * @returns Promise resolving to the registered device object
 */
export const addDeviceToken = async (
  req: RegisterDeviceRequest
): Promise<{ id?: string; token: string; platform: 'ios' | 'android'; userId?: string }> => {
  const response = await apiClient.post('/api/v1/users/me/devices', req);
  return response.data;
};

