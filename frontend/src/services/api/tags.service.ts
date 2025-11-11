import apiClient from '../apiClient';

export interface TagApi {
  id: string;
  name: string;
  color?: string;
}

export interface ListTagsResponse {
  tags: TagApi[];
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

/**
 * Get all tags available for a gallery.
 */
export async function listTagsForGallery(galleryId: string): Promise<TagApi[]> {
  const response = await apiClient.get<ListTagsResponse>(`/api/v1/galleries/${galleryId}/tags`);
  return response.data.tags;
}

/**
 * Create a tag in a gallery (admin/owner).
 */
export async function createTag(galleryId: string, data: CreateTagRequest): Promise<TagApi> {
  const response = await apiClient.post<TagApi>(`/api/v1/galleries/${galleryId}/tags`, data);
  return response.data;
}

/**
 * Update an existing tag (admin/owner).
 */
export async function updateTag(
  galleryId: string,
  tagId: string,
  data: UpdateTagRequest
): Promise<TagApi> {
  const response = await apiClient.put<TagApi>(`/api/v1/galleries/${galleryId}/tags/${tagId}`, data);
  return response.data;
}

/**
 * Delete a tag (admin/owner).
 */
export async function deleteTag(galleryId: string, tagId: string): Promise<void> {
  await apiClient.delete(`/api/v1/galleries/${galleryId}/tags/${tagId}`);
}


