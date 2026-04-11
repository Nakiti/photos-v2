import apiClient from '../apiClient';
import { User } from '../../types';

export interface UserProfile extends User {
  avatarUrl?: string;
  handle: string;
}

export interface UpdateMyProfileRequest {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface RegisterDeviceRequest {
  token: string;
  platform: 'ios' | 'android';
}

export interface SearchUsersRequest {
  search?: string;  // Searches name and handle
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  users: UserProfile[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
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

  // --- Step 1: Get the image file as a blob ---
  console.log('2. Fetching image blob from device...');
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  // Determine file type and extension
  const imageType = blob.type || 'image/jpeg';
  // A simple way to get extension. For more types, use a mime-type library.
  const fileExtension = imageType === 'image/png' ? '.png' : '.jpg'; 

  // --- Step 2: Get a presigned URL from our backend ---
  console.log('3. Requesting presigned URL for', imageType);
  const presignResponse = await apiClient.post(
    '/api/v1/users/me/avatar/presign',
    {
      contentType: imageType,
      fileExtension: fileExtension,
    }
  );
  const { presignedUrl, finalUrl } = presignResponse.data;

  if (!presignedUrl || !finalUrl) {
    throw new Error('Failed to get presigned URL from server.');
  }

  // --- Step 3: Upload the image directly to S3 (WITH ERROR CHECKING) ---
  console.log('4. Uploading image to S3...');
  const s3UploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': imageType,
    },
  });

  // !! THIS IS THE CRITICAL CHECK !!
  if (!s3UploadResponse.ok) {
    console.error('S3 Upload Failed:', s3UploadResponse.status, await s3UploadResponse.text());
    throw new Error('Failed to upload image to S3.');
  }

  // --- Step 4: Confirm the upload with our backend ---
  console.log('5. Confirming upload with backend...', finalUrl);
  const updatedUser = await updateMyProfile({ avatarUrl: finalUrl });

  console.log('6. Avatar upload complete.');
  return updatedUser;
};

/**
 * Search for users by name or handle.
 *
 * @param params Search parameters (search term matches name or handle)
 * @returns Promise resolving to search results with pagination
 */
export const searchUsers = async (params: SearchUsersRequest): Promise<SearchUsersResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

  const response = await apiClient.get(`/api/v1/users/search?${queryParams.toString()}`);
  return response.data as SearchUsersResponse;
};