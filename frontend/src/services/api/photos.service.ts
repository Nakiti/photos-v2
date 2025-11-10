import apiClient from '../apiClient';
import { Photo } from '../../types';

export interface GalleryPhotoItem {
  id: string;
  s3Url: string;
  uploaderId: string;
  createdAt: string;
}

export interface GalleryPhotosResponse {
  items: GalleryPhotoItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
}

export const uploadPhoto = async (
  localUri: string,
  galleryId: string,
): Promise<Photo> => {
  // 1. Get a presigned URL from our backend
  const presignResponse = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/presign`
  );
  const { presignedUrl, s3Key, finalUrl } = presignResponse.data;

  // 2. Get the image file as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();
  const imageType = blob.type || 'image/jpeg';

  // 3. Upload the image directly to S3
  await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': imageType },
  });

  // 4. Confirm the upload with our backend
  const confirmResponse = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/confirm`,
    {
      s3Key: s3Key,
      s3Url: finalUrl,
    }
  );

  return confirmResponse.data as Photo; // Return the final, permanent photo object
};

/**
 * Fetches photos added to a gallery since a given timestamp.
 * @param galleryId - The gallery ID.
 * @param since - An ISO timestamp.
 */
export const fetchPhotos = async (galleryId: string, since?: number): Promise<Photo[]> => {
  let url = `/api/v1/galleries/${galleryId}/photos`;
  if (since) {
    // Convert number timestamp to ISO string for the API
    url += `?since=${new Date(since).toISOString()}`;
  }
  const response = await apiClient.get(url);
  return response.data.items;
};

/**
 * Fetches a lightweight list of all photo IDs for reconciliation.
 * @param galleryId - The gallery ID.
 */
export const fetchPhotoIdsForSync = async (galleryId: string): Promise<string[]> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/photos/sync`);
  return response.data.photoIds;
};

/**
 * Request a presigned URL to upload a photo to object storage.
 *
 * @param galleryId The gallery id
 * @param contentType MIME type of the file to upload
 * @returns Promise resolving to an upload URL and s3Key
 */
export const requestPresignedUrl = async (
  galleryId: string,
  contentType: string
): Promise<PresignResponse> => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/photos/presign`, { contentType });
  return response.data as PresignResponse;
};

/**
 * Confirm a previously uploaded photo so the server persists metadata.
 *
 * @param galleryId The gallery id
 * @param s3Key The object key returned by presign
 * @returns Promise resolving to the created photo item
 */
export const confirmPhotoUpload = async (
  galleryId: string,
  s3Key: string
): Promise<GalleryPhotoItem> => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/photos/confirm`, { s3Key });
  return response.data as GalleryPhotoItem;
};

/**
 * Delete a photo from a gallery. Allowed for uploader or gallery owner.
 *
 * @param galleryId The gallery id
 * @param photoId The photo id to delete
 */
export const deletePhoto = async (galleryId: string, photoId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/galleries/${galleryId}/photos/${photoId}`);
};


