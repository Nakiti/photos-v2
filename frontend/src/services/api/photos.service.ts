import apiClient from '../apiClient';
import { Photo } from '../../types';
import RNFS from 'react-native-fs';

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
 *
 * Why not fetch(fileUri): fetch() on a file:// URI fails on Android ("Network request failed").
 * Why not xhr.send({ uri, type, name }): RN's native layer treats this as multipart/form-data,
 * so the wire Content-Type doesn't match the image/jpeg that was signed into the presigned URL → S3 403.
 *
 * The reliable cross-platform pattern:
 * 1. RNFS.readFile reads the file natively (works on both iOS and Android)
 * 2. fetch('data:...') converts base64 → Blob cleanly without manual byte manipulation
 * 3. fetch PUT sends the Blob with a predictable Content-Type: image/jpeg
 */
const uploadToS3 = async (presignedUrl: string, fileUri: string): Promise<void> => {
  const filePath = fileUri.replace(/^file:\/\//, '');
  const base64 = await RNFS.readFile(filePath, 'base64');

  const blobRes = await fetch(`data:image/jpeg;base64,${base64}`);
  const blob = await blobRes.blob();

  const s3Response = await fetch(presignedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (!s3Response.ok) {
    const body = await s3Response.text().catch(() => '(unreadable)');
    throw new Error(`S3 upload failed: ${s3Response.status} — ${body}`);
  }
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
  console.log(`[Upload] presign start gallery=${galleryId} clientId=${clientId ?? 'none'}`);
  const { full, thumb } = await getPresignedUrls(galleryId, 'image/jpeg', clientId);
  console.log(`[Upload] presign OK full=${full.s3Key} thumb=${thumb.s3Key}`);

  // Persist s3Key before uploading so conflict detection can match socket events
  // that race the confirm response.
  if (onPresign) await onPresign(full.s3Key);

  console.log(`[Upload] s3 PUT start clientId=${clientId ?? 'none'}`);
  await Promise.all([
    uploadToS3(full.presignedUrl, fullImageUri),
    uploadToS3(thumb.presignedUrl, thumbImageUri),
  ]);
  console.log(`[Upload] s3 PUT done s3Key=${full.s3Key}`);

  console.log(`[Upload] confirm start s3Key=${full.s3Key} gallery=${galleryId}`);
  const photo = await confirmUpload(galleryId, {
    s3Key: full.s3Key,
    s3Url: full.finalUrl,
    thumbnailKey: thumb.s3Key,
    thumbnailUrl: thumb.finalUrl,
    tagIds,
    clientId,
  });
  console.log(`[Upload] confirm OK photoId=${photo.id} gallery=${galleryId}`);
  return photo;
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


