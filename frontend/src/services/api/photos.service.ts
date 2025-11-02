import apiClient from '../apiClient';

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

/**
 * List photos for a gallery using pagination.
 *
 * @param galleryId The gallery id
 * @param page Page number (1-based)
 * @param limit Page size
 * @returns Promise resolving to paginated photo items
 */
export const listGalleryPhotos = async (
  galleryId: string,
  page: number,
  limit: number
): Promise<GalleryPhotosResponse> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/photos`, {
    params: { page, limit },
  });
  return response.data as GalleryPhotosResponse;
};

/**
 * Get all photo ids currently in a gallery for reconciliation.
 *
 * @param galleryId The gallery id
 * @returns Promise resolving to an array of photo ids
 */
export const getPhotoIdsForSync = async (galleryId: string): Promise<string[]> => {
  const response = await apiClient.get(`/api/v1/galleries/${galleryId}/photos/sync`);
  return response.data.photoIds as string[];
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


