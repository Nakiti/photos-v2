// src/api/galleries/galleries.controller.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import * as galleriesService from './galleries.service.js';
import {
  createGallerySchema,
  updateGallerySchema,
  joinByLinkSchema,
  type CreateGalleryDto,
  type UpdateGalleryDto,
} from './galleries.validation.js';

/**
 * POST /api/v1/galleries
 * Create a new gallery with the authenticated user as owner.
 */
export async function createGallery(req: Request, res: Response) {
  const ownerId = (req as any).user?.id as string | undefined;
  if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const parsed = createGallerySchema.parse({ body: req.body });
    const { name, type, iconUrl, startDate, endDate, location } = parsed.body as CreateGalleryDto;
    const gallery = await galleriesService.createGallery(ownerId, {
      name,
      type: type as any,
      iconUrl,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      location: location ?? null,
    });
    return res.status(201).json(gallery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
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
  try {
    const parsed = updateGallerySchema.parse({ body: req.body });
    const data = parsed.body as UpdateGalleryDto;
    // Ownership check before update
    const existing = await galleriesService.getGalleryDetails(ownerId, galleryId);
    if (!existing || existing.ownerId !== ownerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await galleriesService.updateGallery(ownerId, galleryId, data);
    return res.status(200).json(updated);
  } catch (error) {
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


