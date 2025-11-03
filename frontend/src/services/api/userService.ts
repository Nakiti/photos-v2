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

/**
 * @param imageUri The 'file://...' URI of the image on the device (from image picker).
 * @returns The updated UserProfile object.
 */
export const uploadNewAvatar = async (imageUri: string): Promise<UserProfile> => {
  console.log('1. Starting avatar upload...');
  
  // --- Step 1: Get a presigned URL from our backend ---
  console.log('2. Requesting presigned URL...');
  const presignResponse = await apiClient.post('/api/v1/users/me/avatar/presign');
  const { presignedUrl, finalUrl } = presignResponse.data;

  if (!presignedUrl || !finalUrl) {
    throw new Error('Failed to get presigned URL from server.');
  }

  // --- Step 2: Get the image file as a blob ---
  console.log('3. Fetching image blob from device...');
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const imageType = blob.type || 'image/jpeg'; // Default to jpeg if type is unknown

  // --- Step 3: Upload the image directly to S3 ---
  console.log('4. Uploading image to S3...');
  await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': imageType, 
    },
  });

  // --- Step 4: Confirm the upload with our backend ---
  console.log('5. Confirming upload with backend...');
  const updatedUser = await updateMyProfile({ avatarUrl: finalUrl });
  
  console.log('6. Avatar upload complete.');
  return updatedUser;
};
