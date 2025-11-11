import { Router, type Request, type Response } from 'express';
import { isAuthenticated } from '../../../../middleware/auth.middleware.js';
import { z } from 'zod';
import * as galleriesService from '../../galleries.service.js';
import * as membersService from '../../members/members.service.js';
import * as photoTagsService from './photoTags.service.js';
import { applyTagSchema } from './photoTags.validation.js';

const router = Router({ mergeParams: true }); // mergeParams is essential

/**
 * @route POST /api/v1/galleries/:galleryId/photos/:photoId/tags
 * @description Apply an existing tag to a photo.
 * @body { tagId: string }
 * @access Private (Member)
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId, photoId } = req.params as { galleryId: string; photoId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });
    const parsed = applyTagSchema.parse({ body: req.body });
    const { tagId } = parsed.body;
    const result = await photoTagsService.applyTagToPhoto(galleryId, photoId, tagId);
    if (result === 'NOT_FOUND') return res.status(404).json({ message: 'Photo or Tag not found in this gallery' });
    return res.status(201).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    if ((error as any)?.status === 409) {
      return res.status(409).json({ message: 'Tag already applied to photo' });
    }
    return res.status(500).json({ message: 'Failed to apply tag to photo' });
  }
});

/**
 * @route DELETE /api/v1/galleries/:galleryId/photos/:photoId/tags/:tagId
 * @description Remove a tag from a photo.
 * @access Private (Member)
 */
router.delete('/:tagId', isAuthenticated, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { galleryId, photoId, tagId } = req.params as { galleryId: string; photoId: string; tagId: string };
    const access = await galleriesService.getGalleryDetails(userId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });
    const removed = await photoTagsService.removeTagFromPhoto(galleryId, photoId, tagId);
    if (!removed) return res.status(404).json({ message: 'Tag not applied to this photo' });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: 'Failed to remove tag from photo' });
  }
});

export default router;