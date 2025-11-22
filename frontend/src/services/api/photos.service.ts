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

/**
 * Upload a single photo to a gallery via presigned URL flow.
 * Steps:
 * 1) Derive MIME type from local file
 * 2) Request a presigned URL from backend
 * 3) PUT the file to object storage
 * 4) Confirm the upload and return the created photo
 *
 * @param {string} localUri Absolute device URI to the image file
 * @param {string} galleryId Identifier of the target gallery
 * @returns {Promise<Photo>} Resolves to the created, permanent photo object
 */
export const uploadPhoto = async (
  localUri: string,
  galleryId: string,
): Promise<Photo> => {
  // 1. Get the image file as a blob to determine content type
  const response = await fetch(localUri);
  const blob = await response.blob();
  const imageType = blob.type || 'image/jpeg';

  // 2. Get a presigned URL from our backend with explicit contentType
  const presignResponse = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/presign`,
    { contentType: imageType }
  );
  const { presignedUrl, s3Key, finalUrl } = presignResponse.data;

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
 * Fetch photos added to a gallery since a given timestamp.
 *
 * @param {string} galleryId The gallery ID
 * @param {number} [since] Optional ms timestamp; if provided, only newer photos are returned
 * @returns {Promise<Photo[]>} Resolves to the array of photos
 */
export const fetchPhotos = async (galleryId: string, since?: number): Promise<Photo[]> => {
  let url = `/api/v1/galleries/${galleryId}/photos`;
  if (since) {
    // Convert number timestamp to ISO string for the API
    url += `?since=${new Date(since).toISOString()}`;
  }

  console.log(`[Cloud][fetchPhotos] GET ${url}`);
  const response = await apiClient.get(url);

  const items = response.data.items as Photo[];
  console.log(
    `[Cloud][fetchPhotos] received ${items.length} items for gallery=${galleryId} (since=${since ?? 'none'})`,
  );
  if (items.length > 0) {
    const sample = items.slice(0, 3).map((p: any) => ({ id: p.id, createdAt: p.createdAt }));
    console.log('[Cloud][fetchPhotos] sample:', sample);
  }
  return items;
};

/**
 * Fetch a lightweight list of all photo IDs for reconciliation/sync.
 *
 * @param {string} galleryId The gallery ID
 * @returns {Promise<string[]>} Resolves to the list of photo IDs
 */
export const fetchPhotoIdsForSync = async (galleryId: string): Promise<string[]> => {
  const path = `/api/v1/galleries/${galleryId}/photos/sync`;
  console.log(`[Cloud][fetchPhotoIdsForSync] GET ${path}`);
  const response = await apiClient.get(path);
  const ids = response.data.photoIds as string[];
  console.log(`[Cloud][fetchPhotoIdsForSync] received ${ids.length} ids for gallery=${galleryId}`);
  if (ids.length > 0) {
    console.log('[Cloud][fetchPhotoIdsForSync] sample:', ids.slice(0, 5));
  }
  return ids;
};

/**
 * Request presigned upload data for both full-size and thumbnail images.
 *
 * @param {string} galleryId Identifier of the target gallery
 * @returns {Promise<{ full: { presignedUrl: string; s3Key: string; finalUrl: string }; thumb: { presignedUrl: string; s3Key: string; finalUrl: string } }>}
 * Resolves to presigned URLs, keys, and final URLs for both assets
 */
const getPresignedUrls = async (galleryId: string, contentType: string): Promise<{
  full: { presignedUrl: string; s3Key: string; finalUrl: string };
  thumb: { presignedUrl: string; s3Key: string; finalUrl: string };
}> => {
  const response = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/presign`,
    { contentType }
  );
  return response.data;
};

/**
 * Upload a local file to object storage using a presigned URL.
 *
 * @param {string} presignedUrl The presigned PUT URL
 * @param {string} fileUri Absolute device URI for the file
 * @param {string} fileType MIME type to set as Content-Type
 * @returns {Promise<void>} Resolves when the upload completes
 */
const uploadToS3 = async (presignedUrl: string, fileUri: string, fileType: string) => {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  
  await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': fileType || 'image/jpeg' },
  });
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
 * Confirm an image upload with the backend and create the photo record.
 *
 * @param {string} galleryId Identifier of the target gallery
 * @param {{ s3Key: string; s3Url: string; thumbnailKey: string; thumbnailUrl: string; tagIds: string[] }} data Upload confirmation payload
 * @param {string} data.s3Key Object storage key for the full-size image
 * @param {string} data.s3Url Public/final URL for the full-size image
 * @param {string} data.thumbnailKey Object storage key for the thumbnail
 * @param {string} data.thumbnailUrl Public/final URL for the thumbnail
 * @param {string[]} data.tagIds Tag IDs to associate with the photo
 * @returns {Promise<Photo>} Resolves to the created photo
 */
const confirmUpload = async (galleryId: string, data: {
  s3Key: string;
  s3Url: string;
  thumbnailKey: string;
  thumbnailUrl: string;
  tagIds: string[];
}): Promise<Photo> => {
  const response = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/confirm`,
    data
  );
  return response.data as Photo;
};

/**
 * Complete, multi-step flow for uploading a new photo (used by the upload queue).
 *
 * @param {string} galleryId Identifier of the target gallery
 * @param {string} fullImageUri Local device URI for the full-size image
 * @param {string} thumbImageUri Local device URI for the thumbnail image
 * @param {string[]} tagIds Tag IDs to associate with the new photo
 * @returns {Promise<Photo>} Resolves to the created photo
 */
export const uploadPhotoFlow = async (
  galleryId: string,
  fullImageUri: string,
  thumbImageUri: string,
  tagIds: string[]
): Promise<Photo> => {
  // 1. Determine content type from the full image
  const fullImageResponse = await fetch(fullImageUri);
  const fullImageBlob = await fullImageResponse.blob();
  const contentType = fullImageBlob.type || 'image/jpeg';

  // 2. Get both presigned URLs from our backend
  const {full, thumb} = await getPresignedUrls(galleryId, contentType);

  // 3. Upload both files to S3 in parallel
  console.log("thumbnail image url", thumb.finalUrl)

  await Promise.all([
    uploadToS3(full.presignedUrl, fullImageUri, 'image/jpeg'),
    uploadToS3(thumb.presignedUrl, thumbImageUri, 'image/jpeg')
  ]);

  // 4. Confirm the upload with our backend
  const finalPhoto = await confirmUpload(galleryId, {
    s3Key: full.s3Key,
    s3Url: full.finalUrl,
    thumbnailKey: thumb.s3Key,
    thumbnailUrl: thumb.finalUrl,
    tagIds: tagIds,
  });
  
  return finalPhoto;
};

/**
 * Delete a photo from a gallery. Allowed for uploader or gallery owner.
 *
 * @param galleryId The gallery id
 * @param photoId The photo id to delete
 * @returns {Promise<void>} Resolves when deletion completes
 */
export const deletePhoto = async (galleryId: string, photoId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/galleries/${galleryId}/photos/${photoId}`);
};


