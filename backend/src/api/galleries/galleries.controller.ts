// src/api/galleries/galleries.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as galleriesService from './galleries.service.js';
import {
  createGallerySchema,
  updateGallerySchema,
  joinByLinkSchema,
  searchGalleriesSchema,
  type CreateGalleryDto,
  type UpdateGalleryDto,
} from './galleries.validation.js';
import { generateIconPresignedUrl } from './galleries.service.js';

/**
 * POST /api/v1/galleries
 * Create a new gallery with the authenticated user as owner.
 */
export async function createGallery(req: Request, res: Response) {
  const ownerId = (req as any).user?.id as string | undefined;
  if (!ownerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Validate the request body
    const parsed = createGallerySchema.parse({ body: req.body });
    const galleryData = parsed.body as CreateGalleryDto;

    // 2. Call the service with the full data object
    //    This now correctly passes 'wantsIconUpload' and permission fields.
    const result = await galleriesService.createGallery(ownerId, galleryData);

    // 3. Return the entire result
    //    This will be { gallery } or { gallery, uploadInfo }
    return res.status(201).json(result);

  } catch (error) {
    console.log(error); // Always good for debugging
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: error.flatten().fieldErrors 
      });
    }
    // Handle any other specific errors (like 'Gallery not found' if needed)
    return res.status(500).json({ message: 'Failed to create gallery' });
  }
}

/**
 * GET /api/v1/galleries
 * List galleries owned by or shared with the user.
 */
export async function getMyGalleries(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  console.log("user id", userId)
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const galleries = await galleriesService.getMyGalleries(userId);
  console.log("galleires ", galleries)
  return res.status(200).json(galleries);
}

/**
 * GET /api/v1/galleries/:galleryId
 * Get details for a gallery if the user has access.
 */
export async function getGalleryDetails(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params;
  const gallery = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!gallery) return res.status(404).json({ message: 'Gallery not found' });
  return res.status(200).json(gallery);
}

/**
 * PUT /api/v1/galleries/:galleryId
 * Update gallery fields (owner only).
 */
export async function updateGallery(req: Request, res: Response) {
  const ownerId = (req as any).user?.id as string | undefined;
  if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params;
  console.log("dat body ", req.body)

  try {
    const parsed = updateGallerySchema.parse({ body: req.body });
    console.log("parsed data ", parsed)
    const data = parsed.body as UpdateGalleryDto;
    // Ownership check before update
    const existing = await galleriesService.getGalleryDetails(ownerId, galleryId);
    if (!existing || existing.ownerId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    console.log("backed update data ", data)
    const updated = await galleriesService.updateGallery(ownerId, galleryId, data);
    return res.status(200).json(updated);
  } catch (error) {
    console.log(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to update gallery' });
  }
}

/**
 * DELETE /api/v1/galleries/:galleryId
 * Delete gallery (owner only).
 */
export async function deleteGallery(req: Request, res: Response) {
  const ownerId = (req as any).user?.id as string | undefined;
  if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params;
  const result = await galleriesService.deleteGallery(ownerId, galleryId);
  if (!result) return res.status(403).json({ message: 'Forbidden' });
  return res.status(204).send();
}

/**
 * POST /api/v1/galleries/join/:shareableLink
 * Join a gallery via public shareable link.
 */
export async function joinGalleryByLink(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = joinByLinkSchema.parse({ params: req.params });
    const { shareableLink } = parsed.params as { shareableLink: string };
    const gallery = await galleriesService.joinGalleryByLink(userId, shareableLink);
    if (!gallery) return res.status(404).json({ message: 'Invalid link' });
    return res.status(200).json(gallery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to join gallery' });
  }
}

/**
 * GET /api/v1/galleries/:galleryId/photos/sync
 * Return an array of photo ids for reconciliation (members only).
 */
export async function reconcileGalleryPhotos(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });
  const photoIds = await galleriesService.getPhotoIdsForGallery(galleryId);
  return res.status(200).json({ photoIds });
}


/**
 * POST /api/v1/galleries/:galleryId/icon/presign
 * Generates a presigned URL for a gallery icon upload.
 */
export const requestIconUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { galleryId } = req.params;
    const userId = (req as any).user.id; // From isAuthenticated middleware

    // The service will handle permission checks
    const { presignedUrl, finalUrl } = await generateIconPresignedUrl(userId, galleryId);

    res.status(200).json({ presignedUrl, finalUrl });
  } catch (error) {
    // Handle errors (e.g., if user is not an admin)
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'You do not have permission to change this icon.' });
    }
    next(error);
  }
};

/**
 * GET /api/v1/galleries/search
 * Search through galleries the user has access to with optional filters
 * Query params: search, name, type, location, limit, offset
 */
export async function searchGalleries(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const parsed = searchGalleriesSchema.parse({ query: req.query });
    const filters = parsed.query;

    // Build filters object conditionally to satisfy exactOptionalPropertyTypes
    const searchFilters: Parameters<typeof galleriesService.searchGalleries>[1] = {
      limit: filters.limit,
      offset: filters.offset,
    };

    if (filters.search !== undefined) searchFilters.search = filters.search;
    if (filters.name !== undefined) searchFilters.name = filters.name;
    if (filters.type !== undefined) searchFilters.type = filters.type;
    if (filters.location !== undefined) searchFilters.location = filters.location;

    const result = await galleriesService.searchGalleries(userId, searchFilters);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to search galleries' });
  }
}