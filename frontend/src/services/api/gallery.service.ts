import apiClient from '../apiClient';
import { Gallery } from '../../types'; // Assuming you have a types directory
import { UpdateGalleryRequest } from '../../types/gallery.types';

// --- Type Definitions for API Responses ---
// It's good practice to have types for what the server sends back.
// This might differ slightly from your WatermelonDB model.
export interface GalleryApiResponse extends Omit<Gallery, '_raw' | 'collections' | 'update' | 'observe' | 'destroyPermanently' | 'prepareUpdate' | 'prepareDestroyPermanently'> {
  // Optional event fields are already present on Gallery type
  iconUrl?: string;
}

export interface CreateGalleryRequest {
  name: string;
  type: 'GROUP' | 'EVENT';
  iconUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
}

/**
 * Fetch all galleries owned by or shared with the current user.
 *
 * @returns Promise resolving to an array of galleries the user can access
 */
export const fetchMyGalleries = async (): Promise<GalleryApiResponse[]> => {
  try {
    const response = await apiClient.get('/api/v1/galleries');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch galleries:', error);
    // You might want to handle errors more gracefully
    return [];
  }
};

/**
 * Create a new gallery with the authenticated user as owner.
 *
 * @param galleryData Data for the new gallery (name, type, optional event fields)
 * @returns Promise resolving to the created gallery
 */
export const createGallery = async (galleryData: CreateGalleryRequest): Promise<GalleryApiResponse> => {
  const response = await apiClient.post('/api/v1/galleries', galleryData);
  return response.data;
};

/**
 * Get details for a specific gallery if the user has access.
 *
 * @param galleryId The gallery id
 * @returns Promise resolving to the gallery details
 */
export const getGalleryDetails = async (galleryId: string): Promise<GalleryApiResponse> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}`);
  console.log("gallery details", response.data)
  return response.data;
};

/**
 * Update a gallery's fields (owner only).
 *
 * @param galleryId The gallery id
 * @param data Fields to update
 * @returns Promise resolving to the updated gallery
 */
export const updateGallery = async (
  galleryId: string,
  data: UpdateGalleryRequest
): Promise<GalleryApiResponse> => {
  console.log("update data ", data)
  const response = await apiClient.put(`/api/v1/galleries/${galleryId}`, data);
  return response.data;
};

/**
 * Delete a gallery (owner only).
 *
 * @param galleryId The gallery id
 */
export const deleteGallery = async (galleryId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/galleries/${galleryId}`);
};

/**
 * Add a user as a member to a gallery.
 *
 * @param galleryId The gallery id
 * @param userId The user to add
 * @returns Promise resolving to the created membership
 */
export const addMember = async (
  galleryId: string,
  userId: string
): Promise<{ id: string; userId: string; galleryId: string; joinedAt?: string }> => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/members`, { userId });
  return response.data;
};

/**
 * Remove a user from a gallery.
 *
 * @param galleryId The gallery id
 * @param userId The user to remove
 */
export const removeMember = async (galleryId: string, userId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/galleries/${galleryId}/members/${userId}`);
};

/**
 * Get all photo ids for a gallery to reconcile local deletes.
 *
 * @param galleryId The gallery id
 * @returns Promise resolving to an array of photo ids
 */
export const getGalleryPhotoIdsForSync = async (
  galleryId: string
): Promise<string[]> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/photos/sync`);
  return response.data.photoIds as string[];
};

/**
 * Get all member userIds for a gallery to reconcile local membership state.
 *
 * @param galleryId The gallery id
 * @returns Promise resolving to an array of member userIds
 */
export const getGalleryMemberUserIdsForSync = async (
  galleryId: string
): Promise<string[]> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/members/sync`);
  return response.data.memberUserIds as string[];
};

/**
 * Join an event gallery via a shareable link.
 *
 * @param shareableLink The public join link
 * @returns Promise resolving to the joined gallery
 */
export const joinGalleryByLink = async (shareableLink: string): Promise<GalleryApiResponse> => {
  const response = await apiClient.post(`/api/v1/galleries/join/${shareableLink}`);
  return response.data;
};

export const uploadNewGalleryIcon = async (
  galleryId: string,
  imageUri: string
): Promise<GalleryApiResponse> => {
  console.log('1. Starting gallery icon upload...', galleryId);

  // Step 1: Read image from device into a Blob
  console.log('2. Fetching image blob from device...');
  const imageFetchResponse = await fetch(imageUri);
  const blob = await imageFetchResponse.blob();

  const imageType = blob.type || 'image/jpeg';
  const fileExtension = imageType === 'image/png' ? '.png' : '.jpg';

  // Step 2: Request a presigned URL from backend
  console.log('3. Requesting presigned URL for', imageType);
  const presignResponse = await apiClient.post(
    `/api/v1/galleries/${galleryId}/icon/presign`,
    {
      contentType: imageType,
      fileExtension,
    }
  );

  const { presignedUrl, finalUrl } = presignResponse.data as {
    presignedUrl?: string;
    finalUrl?: string;
  };

  if (!presignedUrl || !finalUrl) {
    throw new Error('Failed to get presigned URL from server.');
  }

  // Step 3: Upload file directly to object storage
  console.log('4. Uploading image to S3...');
  const s3UploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': imageType,
    },
  });

  if (!s3UploadResponse.ok) {
    console.error(
      'S3 Upload Failed:',
      s3UploadResponse.status,
      await s3UploadResponse.text()
    );
    throw new Error('Failed to upload image to S3.');
  }

  // Step 4: Update gallery with the new icon URL
  console.log('5. Confirming upload with backend...', finalUrl);
  const updatedGallery = await updateGallery(galleryId, {
    iconUrl: finalUrl,
  } as UpdateGalleryRequest);

  console.log('6. Gallery icon upload complete.');
  return updatedGallery;
}