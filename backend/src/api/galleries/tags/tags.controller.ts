import type { Request, Response } from 'express';
import { z } from 'zod';
import * as tagsService from './tags.service.js';
import * as galleriesService from '../galleries.service.js';
import * as membersService from '../members/members.service.js';
import { createTagSchema, updateTagSchema } from './tags.validation.js';

/**
 * GET /api/v1/galleries/:galleryId/tags
 * List tags for a gallery (members only).
 */
export async function listTagsForGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });
    const tags = await tagsService.listTagsForGallery(galleryId);
    return res.status(200).json({ tags });
  } catch {
    return res.status(500).json({ message: 'Failed to list tags' });
  }
}

/**
 * POST /api/v1/galleries/:galleryId/tags
 * Create a tag (admin or owner only).
 */
export async function createTag(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId } = req.params as { galleryId: string };
    const isAdmin = await membersService.isAdminOrOwner(userId, galleryId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const parsed = createTagSchema.parse({ body: req.body });
    const { name, color } = parsed.body;
    const payload = { name, ...(color ? { color } : {}) };
    const result = await tagsService.createTag(galleryId, payload);
    if (result.conflict) {
      return res.status(409).json({ message: 'A tag with this name already exists in this gallery' });
    }
    return res.status(201).json(result.tag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    if ((error as any)?.status === 409) {
      return res.status(409).json({ message: 'A tag with this name already exists in this gallery' });
    }
    return res.status(500).json({ message: 'Failed to create tag' });
  }
}

/**
 * PUT /api/v1/galleries/:galleryId/tags/:tagId
 * Update tag fields (admin or owner only).
 */
export async function updateTag(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId, tagId } = req.params as { galleryId: string; tagId: string };
    const isAdmin = await membersService.isAdminOrOwner(userId, galleryId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const parsed = updateTagSchema.parse({ body: req.body });
    const body = parsed.body as Record<string, string | undefined>;
    const updatePayload: { name?: string; color?: string } = {};
    if ('name' in body) {
      if (typeof body.name === 'string') updatePayload.name = body.name;
    }
    if ('color' in body) {
      if (typeof body.color === 'string') updatePayload.color = body.color;
    }
    const updated = await tagsService.updateTag(galleryId, tagId, updatePayload);
    if (!updated) return res.status(404).json({ message: 'Tag not found' });
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    if ((error as any)?.status === 409) {
      return res.status(409).json({ message: 'A tag with this name already exists in this gallery' });
    }
    return res.status(500).json({ message: 'Failed to update tag' });
  }
}

/**
 * DELETE /api/v1/galleries/:galleryId/tags/:tagId
 * Delete a tag (admin or owner only).
 * PhotoTag rows are cascade-deleted via Prisma schema.
 */
export async function deleteTag(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId, tagId } = req.params as { galleryId: string; tagId: string };
    const isAdmin = await membersService.isAdminOrOwner(userId, galleryId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const ok = await tagsService.deleteTag(galleryId, tagId);
    if (!ok) return res.status(404).json({ message: 'Tag not found' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Failed to delete tag' });
  }
}


