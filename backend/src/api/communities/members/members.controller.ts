import type { Request, Response } from 'express';
import { z } from 'zod';
import * as communitiesService from '../communities.service.js';
import * as membersService from './members.service.js';
import { addMemberSchema, type AddMemberDto } from './members.validation.js';

export async function addMember(req: Request, res: Response) {
	const requesterId = (req as any).user?.id as string | undefined;
	if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	try {
		const parsed = addMemberSchema.parse({ body: req.body });
		const { userId } = parsed.body as AddMemberDto;
		const access = await membersService.isAdminOrOwner(requesterId, communityId);
		if (!access) return res.status(403).json({ message: 'Forbidden' });
		const membership = await membersService.addMember(communityId, userId);
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
	const { communityId, userId } = req.params as { communityId: string; userId: string };
	const access = await membersService.isAdminOrOwner(requesterId, communityId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });
	await membersService.removeMember(communityId, userId);
	return res.status(204).send();
}

export async function getMembers(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	const access = await communitiesService.getCommunityDetails(userId, communityId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });
	const members = await membersService.getMembers(communityId);
	return res.status(200).json({ members });
}

export async function promoteMember(req: Request, res: Response) {
	const requesterId = (req as any).user?.id as string | undefined;
	if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId, userId } = req.params as { communityId: string; userId: string };
	const isAdmin = await membersService.isAdminOrOwner(requesterId, communityId);
	if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
	const updated = await membersService.promoteMember(communityId, userId);
	return res.status(200).json(updated);
}

export async function joinCommunity(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	const community = await communitiesService.getCommunityById(communityId);
	if (!community) return res.status(404).json({ message: 'Community not found' });
	const membership = await membersService.joinCommunity(communityId, userId);
	return res.status(201).json(membership);
}

export async function leaveCommunity(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { communityId } = req.params as { communityId: string };
	await membersService.leaveCommunity(communityId, userId);
	return res.status(204).send();
}

export async function getMyMembership(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const parsed = z
		.object({ params: z.object({ communityId: z.string().uuid('Invalid community id') }) })
		.safeParse({ params: req.params });
	if (!parsed.success) {
		return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
	}
	const { communityId } = parsed.data.params as { communityId: string };
	const access = await communitiesService.getCommunityDetails(userId, communityId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });
	const membership = await membersService.getMembership(userId, communityId);
	if (!membership) return res.status(404).json({ message: 'Membership not found' });
	return res.status(200).json(membership);
}


