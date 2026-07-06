import { z } from 'zod';

export const createGroupSchema = z.object({
	body: z.object({
		name: z.string().min(2, 'Name is required').max(100, 'Name must be at most 100 characters'),
		description: z.string().max(500).optional(),
		iconUrl: z.string().url().optional(),
		wantsIconUpload: z.boolean().optional(),
	}),
});

export type CreateGroupDto = z.infer<typeof createGroupSchema>['body'];

export const updateGroupSchema = z.object({
	body: z.object({
		name: z.string().min(2).max(100).optional(),
		description: z.string().max(500).optional(),
		iconUrl: z.string().url().optional(),
		addPermission: z.enum(['ANYONE', 'ADMIN']).optional(),
		deletePermission: z.enum(['ADMINS_AUTHORS', 'ADMIN']).optional(),
	}),
});

export type UpdateGroupDto = z.infer<typeof updateGroupSchema>['body'];

export const transferOwnershipSchema = z.object({
	body: z.object({
		newOwnerId: z.string().uuid('Invalid user ID'),
	}),
});

export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>['body'];
