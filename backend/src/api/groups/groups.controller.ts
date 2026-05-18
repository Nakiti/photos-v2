import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as groupsService from './groups.service.js';
import {
	createGroupSchema,
	updateGroupSchema,
	transferOwnershipSchema,
	type CreateGroupDto,
	type UpdateGroupDto,
	type TransferOwnershipDto,
} from './groups.validation.js';

export async function createGroup(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const parsed = createGroupSchema.parse({ body: req.body });
		const payload = parsed.body as CreateGroupDto;
		const result = await groupsService.createGroup(ownerId, payload);
		return res.status(201).json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		return res.status(500).json({ message: 'Failed to create group' });
	}
}

export async function getMyGroups(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const groups = await groupsService.getMyGroups(userId);
	return res.status(200).json(groups);
}

export async function getGroupDetails(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	const group = await groupsService.getGroupDetails(userId, groupId);
	if (!group) return res.status(404).json({ message: 'Group not found' });
	return res.status(200).json(group);
}

export async function updateGroup(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	try {
		const parsed = updateGroupSchema.parse({ body: req.body });
		const data = parsed.body as UpdateGroupDto;
		const updated = await groupsService.updateGroup(ownerId, groupId, data);
		if (!updated) return res.status(403).json({ message: 'Forbidden' });
		return res.status(200).json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		return res.status(500).json({ message: 'Failed to update group' });
	}
}

export async function deleteGroup(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	const ok = await groupsService.deleteGroup(ownerId, groupId);
	if (!ok) return res.status(403).json({ message: 'Forbidden' });
	return res.status(204).send();
}

export const requestIconUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { groupId } = req.params as { groupId: string };
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { contentType, fileExtension } = req.body as { contentType?: string; fileExtension?: string };
		const { presignedUrl, finalUrl } = await groupsService.generateIconPresignedUrl(userId, groupId, contentType, fileExtension);
		res.status(200).json({ presignedUrl, finalUrl });
	} catch (error) {
		if ((error as any).message === 'Forbidden') {
			return res.status(403).json({ message: 'You do not have permission to change this icon.' });
		}
		next(error);
	}
};

/**
 * PUT /api/v1/communities/:groupId/transfer-ownership
 * Transfer ownership of a group to another member (owner only).
 */
export async function transferOwnership(req: Request, res: Response) {
	const currentOwnerId = (req as any).user?.id as string | undefined;
	if (!currentOwnerId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };

	try {
		const parsed = transferOwnershipSchema.parse({ body: req.body });
		const { newOwnerId } = parsed.body as TransferOwnershipDto;

		const updated = await groupsService.transferOwnership(currentOwnerId, groupId, newOwnerId);
		if (!updated) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		return res.status(200).json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		if ((error as any).message === 'New owner must be a member of the group') {
			return res.status(400).json({ message: (error as any).message });
		}
		return res.status(500).json({ message: 'Failed to transfer ownership' });
	}
}

/**
 * GET /api/v1/communities/:groupId/share-link
 * Generate a Branch.io deep link for sharing a group.
 */
export async function getShareLink(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	try {
		const shareLink = await groupsService.createGroupShareLink(userId, groupId);
		return res.status(200).json({ shareLink });
	} catch (e: any) {
		if (e?.message?.includes('not found')) return res.status(404).json({ message: e.message });
		return res.status(500).json({ message: 'Failed to generate share link' });
	}
}
