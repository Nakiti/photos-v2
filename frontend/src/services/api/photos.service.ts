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
const FETCH_PAGE_SIZE = 100;

export const fetchPhotos = async (galleryId: string, since?: number): Promise<Photo[]> => {
  const all: Photo[] = [];
  let page = 1;

  while (true) {
    let url = `/api/v1/galleries/${galleryId}/photos?page=${page}&limit=${FETCH_PAGE_SIZE}`;
    if (since) {
      url += `&since=${new Date(since).toISOString()}`;
    }

    const response = await apiClient.get(url);
    const { items, total } = response.data as { items: Photo[]; total: number };
    all.push(...items);

    // Stop when we have everything or the page came back short
    if (all.length >= total || items.length < FETCH_PAGE_SIZE) break;
    page++;
  }

  console.log(
    `[Cloud][fetchPhotos] gallery=${galleryId} since=${since ?? 'none'} total=${all.length} pages=${page}`,
  );
  return all;
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
const getPresignedUrls = async (galleryId: string, contentType: string, clientId?: string): Promise<{
  full: { presignedUrl: string; s3Key: string; finalUrl: string };
  thumb: { presignedUrl: string; s3Key: string; finalUrl: string };
}> => {
  const response = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/presign`,
    { contentType, clientId }
  );
  return response.data;
};

/**
 * Upload a local file to object storage using a presigned URL.
 * Uses XMLHttpRequest instead of fetch — React Native's XHR natively streams
 * file:// URIs without loading the full image into the JS heap as a Blob,
 * avoiding the "Network request failed" error that fetch produces for large local files.
 */
const uploadToS3 = (presignedUrl: string, fileUri: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('S3 upload timed out'));
    // React Native XHR accepts { uri, type, name } and handles file reading natively
    xhr.send({ uri: fileUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
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
  clientId?: string;
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
  tagIds: string[],
  clientId?: string,
  onPresign?: (s3Key: string) => Promise<void>,
): Promise<Photo> => {
  const { full, thumb } = await getPresignedUrls(galleryId, 'image/jpeg', clientId);

  // Persist s3Key before uploading so conflict detection can match socket events
  // that race the confirm response.
  if (onPresign) await onPresign(full.s3Key);

  await Promise.all([
    uploadToS3(full.presignedUrl, fullImageUri),
    uploadToS3(thumb.presignedUrl, thumbImageUri),
  ]);

  return confirmUpload(galleryId, {
    s3Key: full.s3Key,
    s3Url: full.finalUrl,
    thumbnailKey: thumb.s3Key,
    thumbnailUrl: thumb.finalUrl,
    tagIds,
    clientId,
  });
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

export const getPhotoLikeStatus = async (
  galleryId: string,
  photoId: string
): Promise<{ liked: boolean; likeCount: number }> => {
  const response = await apiClient.get(
    `/api/v1/galleries/${galleryId}/photos/${photoId}/like`
  );
  return response.data;
};

export const likePhoto = async (
  galleryId: string,
  photoId: string
): Promise<{ liked: boolean; likeCount: number }> => {
  const response = await apiClient.post(
    `/api/v1/galleries/${galleryId}/photos/${photoId}/like`
  );
  return response.data;
};

export const unlikePhoto = async (
  galleryId: string,
  photoId: string
): Promise<{ liked: boolean; likeCount: number }> => {
  const response = await apiClient.delete(
    `/api/v1/galleries/${galleryId}/photos/${photoId}/like`
  );
  return response.data;
};

/**
 * Fetch photo IDs soft-deleted in a gallery since a given timestamp.
 * Used for delta reconciliation instead of fetching the full ID list every sync.
 */
export const fetchDeletedPhotoIds = async (galleryId: string, since: number): Promise<string[]> => {
  const path = `/api/v1/galleries/${galleryId}/photos/deleted-since?since=${new Date(since).toISOString()}`;
  const response = await apiClient.get(path);
  return response.data.deletedIds as string[];
};

export const approveAllPhotos = async (galleryId: string): Promise<{ count: number }> => {
  const response = await apiClient.post(`/api/v1/galleries/${galleryId}/photos/approve-all`);
  return response.data as { count: number };
};


