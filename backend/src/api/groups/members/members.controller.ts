import type { Request, Response } from 'express';
import { z } from 'zod';
import * as groupsService from '../groups.service.js';
import * as membersService from './members.service.js';
import { addMemberSchema, type AddMemberDto } from './members.validation.js';

export async function addMember(req: Request, res: Response) {
	const requesterId = (req as any).user?.id as string | undefined;
	if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	try {
		const parsed = addMemberSchema.parse({ body: req.body });
		const { userId } = parsed.body as AddMemberDto;
		const access = await membersService.isAdminOrOwner(requesterId, groupId);
		if (!access) return res.status(403).json({ message: 'Forbidden' });
		const membership = await membersService.addMember(groupId, userId);
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
	const { groupId, userId } = req.params as { groupId: string; userId: string };
	const access = await membersService.isAdminOrOwner(requesterId, groupId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });
	await membersService.removeMember(groupId, userId);
	return res.status(204).send();
}

export async function getMembers(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	const { status } = req.query as { status?: 'PENDING' | 'ACCEPTED' | 'INVITED' | 'BLOCKED' };
	const access = await groupsService.getGroupDetails(userId, groupId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });

	const allowedStatuses = ['PENDING', 'ACCEPTED', 'INVITED', 'BLOCKED'] as const;
	if (status && (allowedStatuses as readonly string[]).includes(status)) {
		const filtered = await membersService.getMembers(groupId, status as any);
		return res.status(200).json(filtered);
	}

	const [accepted, pending, invited] = await Promise.all([
		membersService.getMembers(groupId, 'ACCEPTED'),
		membersService.getMembers(groupId, 'PENDING'),
		membersService.getMembers(groupId, 'INVITED'),
	]);

	return res.status(200).json({ members: accepted, pending: [...pending, ...invited] });
}

export async function promoteMember(req: Request, res: Response) {
	const requesterId = (req as any).user?.id as string | undefined;
	if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId, userId } = req.params as { groupId: string; userId: string };
	const isAdmin = await membersService.isAdminOrOwner(requesterId, groupId);
	if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
	const updated = await membersService.promoteMember(groupId, userId);
	return res.status(200).json(updated);
}

export async function joinGroup(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	const group = await groupsService.getGroupById(groupId);
	if (!group) return res.status(404).json({ message: 'Group not found' });
	const membership = await membersService.joinGroup(groupId, userId);
	return res.status(201).json(membership);
}

export async function leaveGroup(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId } = req.params as { groupId: string };
	await membersService.leaveGroup(groupId, userId);
	return res.status(204).send();
}

export async function getMyMembership(req: Request, res: Response) {
	const userId = (req as any).user?.id as string | undefined;
	if (!userId) return res.status(401).json({ message: 'Unauthorized' });
	const parsed = z
		.object({ params: z.object({ groupId: z.string().uuid('Invalid group id') }) })
		.safeParse({ params: req.params });
	if (!parsed.success) {
		return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
	}
	const { groupId } = parsed.data.params as { groupId: string };
	const access = await groupsService.getGroupDetails(userId, groupId);
	if (!access) return res.status(403).json({ message: 'Forbidden' });
	const membership = await membersService.getMembership(userId, groupId);
	if (!membership) return res.status(404).json({ message: 'Membership not found' });
	return res.status(200).json(membership);
}

/**
 * PUT /api/v1/communities/:groupId/members/:userId/approve (Admin Only)
 * Approve a pending membership.
 */
export async function approveMember(req: Request, res: Response) {
	const requesterId = (req as any).user?.id as string | undefined;
	if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });
	const { groupId, userId } = req.params as { groupId: string; userId: string };
	const isAdmin = await membersService.isAdminOrOwner(requesterId, groupId);
	if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });
	const updated = await membersService.approveMember(groupId, userId);
	if (!updated) return res.status(400).json({ message: 'Membership is not pending' });
	return res.status(200).json(updated);
}
