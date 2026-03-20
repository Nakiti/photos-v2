import type { Request, Response } from 'express';
import { z } from 'zod';
import * as photosService from './photos.service.js';
import * as galleriesService from '../galleries.service.js';
import { getPhotosQuerySchema, presignBodySchema, confirmBodySchema, updatePhotoVisibilitySchema } from './photos.validation.js';
import * as membersService from '../members/members.service.js';

/**
 * GET /api/v1/galleries/:galleryId/photos
 * List photos for a gallery (paginated).
 */
export async function getPhotosForGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });

    const parsed = getPhotosQuerySchema.parse({ query: req.query });
    const { page, limit, tagId } = parsed.query as { page: number; limit: number; tagId?: string };
    const result = await photosService.listPhotos(galleryId, page, limit, tagId, userId);

    console.log("photos result ", result)
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to fetch photos' });
  }
}

/**
 * GET /api/v1/galleries/:galleryId/photos/sync
 * Return array of photo ids for reconciliation.
 */
export async function getPhotoIdsForSync(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });
  const photoIds = await photosService.getPhotoIdsForGallery(galleryId);
  return res.status(200).json({ photoIds });
}

/**
 * POST /api/v1/galleries/:galleryId/photos/presign
 * Return a presigned URL to upload a photo to S3.
 */
export async function requestPresignedUrl(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });

    const parsed = presignBodySchema.parse({ body: req.body });
    const { contentType } = parsed.body;
    const presign = await photosService.createPresignedUploadUrls(galleryId, contentType, userId);

    console.log("presign urls ", presign)
    return res.status(200).json(presign);
  } catch (error) {
    console.log(error)

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to create presigned URL' });
  }
}

/**
 * POST /api/v1/galleries/:galleryId/photos/confirm
 * Confirm an uploaded photo and persist metadata.
 */
export async function confirmPhotoUpload(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });

    const parsed = confirmBodySchema.parse({ body: req.body });
    const { s3Key, s3Url, tagIds, thumbnailKey, thumbnailUrl } = parsed.body as { s3Key: string; s3Url?: string; tagIds?: string[]; thumbnailKey: string; thumbnailUrl: string };
    const photo = await photosService.confirmUploadedPhoto(userId, galleryId, s3Key, thumbnailUrl, thumbnailKey, s3Url, tagIds);
    return res.status(201).json(photo);
  } catch (error) {
    console.log(error)

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to confirm photo upload' });
  }
}

/**
 * DELETE /api/v1/galleries/:galleryId/photos/:photoId
 * Delete a photo if requester is uploader or gallery owner.
 */
export async function deletePhoto(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, photoId } = req.params as { galleryId: string; photoId: string };
  const allowed = await photosService.deletePhoto(userId, galleryId, photoId);
  if (!allowed) return res.status(403).json({ message: 'Forbidden' });
  return res.status(204).send();
}

/**
 * PATCH /api/v1/galleries/:galleryId/photos/:photoId/visibility
 * Update photo visibility status. Only allowed for gallery owner or admin.
 */
export async function updatePhotoVisibility(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId, photoId } = req.params as { galleryId: string; photoId: string };
    const parsed = updatePhotoVisibilitySchema.parse({ body: req.body });
    const { visible } = parsed.body;

    const updated = await photosService.updatePhotoVisibility(userId, galleryId, photoId, visible);
    if (!updated) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to update photo visibility' });
  }
}

/**
 * POST /api/v1/galleries/:galleryId/photos/approve-all
 * Approve all in-review photos in a gallery. Only allowed for gallery owner or admin.
 */
export async function approveAllPhotos(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    
    // Get all in-review photos for this gallery
    const result = await photosService.approveAllInReviewPhotos(userId, galleryId);
    if (!result) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve photos' });
  }
}




