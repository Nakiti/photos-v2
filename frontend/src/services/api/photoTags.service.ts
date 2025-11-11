import apiClient from '../apiClient';

/**
 * Apply an existing tag to a photo.
 */
export async function applyTagToPhoto(
  galleryId: string,
  photoId: string,
  tagId: string
): Promise<void> {
  await apiClient.post(`/api/v1/galleries/${galleryId}/photos/${photoId}/tags`, { tagId });
}

/**
 * Remove a tag from a photo.
 */
export async function removeTagFromPhoto(
  galleryId: string,
  photoId: string,
  tagId: string
): Promise<void> {
  await apiClient.delete(`/api/v1/galleries/${galleryId}/photos/${photoId}/tags/${tagId}`);
}


