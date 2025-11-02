import type { Request, Response } from 'express';
import { z } from 'zod';
import * as galleriesService from '../galleries.service.js';
import * as membersService from './members.service.js';
import { addMemberSchema, type AddMemberDto, inviteMemberSchema, type InviteMemberDto, updateMyMembershipSchema, type UpdateMyMembershipDto } from './members.validation.js';

/**
 * Controller handlers for gallery members.
 *
 * Exposes operations to add/remove members and to reconcile
 * members for a given gallery. All handlers expect the user to be
 * authenticated and rely on gallery access checks.
 */

/**
 * Add a member to a gallery.
 * @route POST /api/v1/galleries/:galleryId/members
 * @param req Express Request containing `params.galleryId` and body `{ userId }`.
 * @param res Express Response.
 * @returns 201 with the created membership, or an error status.
 */
export async function addMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  try {
    const parsed = addMemberSchema.parse({ body: req.body });
    const { userId } = parsed.body as AddMemberDto;
    // Simple access policy: requester must be owner or member
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

/**
 * Remove a member from a gallery.
 * @route DELETE /api/v1/galleries/:galleryId/members/:userId
 * @param req Express Request containing `params.galleryId` and `params.userId`.
 * @param res Express Response.
 * @returns 204 on success, or an error status.
 */
export async function removeMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, userId } = req.params as { galleryId: string; userId: string };
  // Admin-only action: requester must be owner or admin
  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
  await membersService.removeMember(galleryId, userId);
  return res.status(204).send();
}

/**
 * Return a list of member userIds for a gallery to help clients reconcile state.
 * @route GET /api/v1/galleries/:galleryId/members/sync
 * @param req Express Request containing `params.galleryId`.
 * @param res Express Response.
 * @returns 200 with `{ memberUserIds: string[] }`, or an error status.
 */
export async function reconcileGalleryMembers(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });
  const memberUserIds = await membersService.getMemberUserIdsForGallery(galleryId);
  return res.status(200).json({ memberUserIds });
}

/**
 * Return categorized lists of members for a gallery.
 * @param req Express Request containing `params.galleryId`.
 * @param res Express Response.
 * @returns 200 with `{ members: RemoteMember[], pending: RemoteMember[] }`.
 */
export async function getMembers(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { galleryId } = req.params as { galleryId: string };
  const { status } = req.query as { status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED' };
  const access = await galleriesService.getGalleryDetails(userId, galleryId);

  if (!access) return res.status(403).json({ message: 'Forbidden' });

  const allowedStatuses = ['PENDING', 'ACCEPTED', 'INVITED', 'BLOCKED'] as const;
  if (status && (allowedStatuses as readonly string[]).includes(status)) {
    const filtered = await membersService.getMembers(galleryId, status as any);
    return res.status(200).json(filtered);
  }

  const [accepted, pending] = await Promise.all([
    membersService.getMembers(galleryId, 'ACCEPTED'),
    membersService.getMembers(galleryId, 'PENDING'),
  ]);

  return res.status(200).json({ members: accepted, pending });
}

/**
 * POST /api/v1/galleries/:galleryId/join
 * A user requests to join a gallery. If approval required, create PENDING; else ACCEPTED.
 */
export async function joinGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };

  const gallery = await galleriesService.getGalleryById(galleryId);
  if (!gallery) return res.status(404).json({ message: 'Gallery not found' });

  // Until a gallery setting exists, default to open join (no approval)
  const requiresApproval = false;
  const status: 'ACCEPTED' | 'PENDING' = requiresApproval ? 'PENDING' : 'ACCEPTED';

  const membership = await membersService.joinGallery(galleryId, userId, status);
  return res.status(201).json(membership);
}

/**
 * PUT /api/v1/galleries/:galleryId/invites/accept
 * Accept an invitation for the current user.
 */
export async function acceptInvite(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const updated = await membersService.acceptInvite(galleryId, userId);
  if (!updated) return res.status(400).json({ message: 'No invitation to accept' });
  return res.status(200).json(updated);
}

/**
 * DELETE /api/v1/galleries/:galleryId/leave
 * Leave a gallery (or decline an invite).
 */
export async function leaveGallery(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  await membersService.leaveGallery(galleryId, userId);
  return res.status(204).send();
}

/**
 * POST /api/v1/galleries/:galleryId/invites (Admin Only)
 * Invite a user to the gallery.
 */
export async function inviteMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };
  const parsed = inviteMemberSchema.safeParse({ body: req.body });
  if (!parsed.success) return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
  const { userIdToInvite } = parsed.data.body as InviteMemberDto;

  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

  const membership = await membersService.inviteMember(galleryId, userIdToInvite);
  return res.status(201).json(membership);
}

/**
 * PUT /api/v1/galleries/:galleryId/members/:userId/promote (Admin Only)
 * Promote a member to admin.
 */
export async function promoteMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, userId } = req.params as { galleryId: string; userId: string };
  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
  const updated = await membersService.promoteMember(galleryId, userId);
  return res.status(200).json(updated);
}

/**
 * PUT /api/v1/galleries/:galleryId/members/:userId/approve (Admin Only)
 * Approve a pending membership.
 */
export async function approveMember(req: Request, res: Response) {
  const requesterId = (req as any).user?.id as string | undefined;
  if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId, userId } = req.params as { galleryId: string; userId: string };
  const isAdmin = await membersService.isAdminOrOwner(requesterId, galleryId);
  if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
  const updated = await membersService.approveMember(galleryId, userId);
  if (!updated) return res.status(400).json({ message: 'Membership is not pending' });
  return res.status(200).json(updated);
}

/**
 * PUT /api/v1/galleries/:galleryId/members/me
 * Update the current user's membership preferences (e.g., isMuted).
 */
export async function updateMyMembership(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { galleryId } = req.params as { galleryId: string };

  const parsed = updateMyMembershipSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
  }

  // Ensure requester has access to the gallery
  const access = await galleriesService.getGalleryDetails(userId, galleryId);
  if (!access) return res.status(403).json({ message: 'Forbidden' });

  const payload = parsed.data.body as UpdateMyMembershipDto;
  const updated = await membersService.updateMyMembership(galleryId, userId, payload);
  if (!updated) return res.status(404).json({ message: 'Membership not found' });
  return res.status(200).json(updated);
}

