import type { Request, Response } from 'express';
import { z } from 'zod';
import * as galleriesService from '../galleries.service.js';
import * as membersService from './members.service.js';
import { addMemberSchema, type AddMemberDto, updateMyMembershipSchema, type UpdateMyMembershipDto, addCommunityMembersSchema, type AddCommunityMembersDto } from './members.validation.js';

export async function addMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  try {
    const parsed = addMemberSchema.parse({ body: req.body });
    const { userId } = parsed.body as AddMemberDto;
    const access = await galleriesService.getGalleryDetails(requesterId, galleryId);
    if (!access) return res.status(403).json({ message: 'Forbidden' });
    const membership = await membersService.addMember(galleryId, userId);
    return res.status(201).json(membership);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to add member' });
  }
}

export async function removeMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, userId } = req.params as { galleryId: string; userId: string };
  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
  await membersService.removeMember(galleryId, userId);
  return res.status(204).send();
}

export async function reconcileGalleryMembers(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });
  const memberUserIds = await membersService.getMemberUserIdsForGallery(galleryId);
  return res.status(200).json({ memberUserIds });
}

export async function getMembers(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });
  const members = await membersService.getMembers(galleryId);
  return res.status(200).json({ members });
}

export async function joinGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const gallery = await galleriesService.getGalleryById(galleryId);
  if (!gallery) return res.status(404).json({ message: 'Gallery not found' });
  const membership = await membersService.joinGallery(galleryId, userId);
  return res.status(201).json(membership);
}

export async function leaveGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  await membersService.leaveGallery(galleryId, userId);
  return res.status(204).send();
}

export async function promoteMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, userId } = req.params as { galleryId: string; userId: string };
  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
  const updated = await membersService.promoteMember(galleryId, userId);
  return res.status(200).json(updated);
}

export async function updateMyMembership(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };

  const parsed = updateMyMembershipSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
  }

  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });

  const payload = parsed.data.body as UpdateMyMembershipDto;
  const updated = await membersService.updateMyMembership(galleryId, userId, payload);
  if (!updated) return res.status(404).json({ message: 'Membership not found' });
  return res.status(200).json(updated);
}

export async function getMyMembership(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const parsed = z
    .object({ params: z.object({ galleryId: z.string().uuid('Invalid gallery id') }) })
    .safeParse({ params: req.params });
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
  }

  const { galleryId } = parsed.data.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });

  const membership = await membersService.getMembership(userId, galleryId);
  if (!membership) return res.status(404).json({ message: 'Membership not found' });
  return res.status(200).json(membership);
}

export async function addCommunityMembersToGallery(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };

  try {
    const parsed = addCommunityMembersSchema.parse({ body: req.body });
    const { communityId } = parsed.body as AddCommunityMembersDto;

    const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const access = await galleriesService.getGalleryDetails(requesterId, galleryId);
    if (!access) return res.status(404).json({ message: 'Gallery not found' });

    const result = await membersService.addCommunityMembersToGallery(galleryId, communityId);

    return res.status(201).json({
      addedCount: result.addedCount,
      errors: result.errors,
      message: `Successfully added ${result.addedCount} member(s) to the gallery`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    return res.status(500).json({ message: 'Failed to add community members' });
  }
}
