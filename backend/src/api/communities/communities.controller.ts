import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as communitiesService from './communities.service.js';
import {
	createCommunitySchema,
	updateCommunitySchema,
	transferOwnershipSchema,
	type CreateCommunityDto,
	type UpdateCommunityDto,
	type TransferOwnershipDto,
} from './communities.validation.js';

export async function createCommunity(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const parsed = createCommunitySchema.parse({ body: req.body });
		const payload = parsed.body as CreateCommunityDto;
		const result = await communitiesService.createCommunity(ownerId, payload);
		return res.status(201).json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		return res.status(500).json({ message: 'Failed to create community' });
	}
}

export async function getMyCommunities(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const communities = await communitiesService.getMyCommunities(userId);
	return res.status(200).json(communities);
}

export async function getCommunityDetails(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	const community = await communitiesService.getCommunityDetails(userId, communityId);
	if (!community) return res.status(404).json({ message: 'Community not found' });
	return res.status(200).json(community);
}

export async function updateCommunity(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	try {
		const parsed = updateCommunitySchema.parse({ body: req.body });
		const data = parsed.body as UpdateCommunityDto;
		const updated = await communitiesService.updateCommunity(ownerId, communityId, data);
		if (!updated) return res.status(403).json({ message: 'Forbidden' });
		return res.status(200).json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		return res.status(500).json({ message: 'Failed to update community' });
	}
}

export async function deleteCommunity(req: Request, res: Response) {
	const ownerId = (req as any).user?.id as string | undefined;
	if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	const ok = await communitiesService.deleteCommunity(ownerId, communityId);
	if (!ok) return res.status(403).json({ message: 'Forbidden' });
	return res.status(204).send();
}

export const requestIconUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { communityId } = req.params as { communityId: string };
		const userId = (req as any).user?.id as string | undefined;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { presignedUrl, finalUrl } = await communitiesService.generateIconPresignedUrl(userId, communityId);
		res.status(200).json({ presignedUrl, finalUrl });
	} catch (error) {
		if ((error as any).message === 'Forbidden') {
			return res.status(403).json({ message: 'You do not have permission to change this icon.' });
		}
		next(error);
	}
};

/**
 * PUT /api/v1/communities/:communityId/transfer-ownership
 * Transfer ownership of a community to another member (owner only).
 */
export async function transferOwnership(req: Request, res: Response) {
	const currentOwnerId = (req as any).user?.id as string | undefined;
	if (!currentOwnerId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	
	try {
		const parsed = transferOwnershipSchema.parse({ body: req.body });
		const { newOwnerId } = parsed.body as TransferOwnershipDto;
		
		const updated = await communitiesService.transferOwnership(currentOwnerId, communityId, newOwnerId);
		if (!updated) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		
		return res.status(200).json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
		}
		if ((error as any).message === 'New owner must be a member of the community') {
			return res.status(400).json({ message: (error as any).message });
		}
		return res.status(500).json({ message: 'Failed to transfer ownership' });
	}
}









