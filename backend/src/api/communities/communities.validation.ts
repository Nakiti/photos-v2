import { z } from 'zod';

export const createCommunitySchema = z.object({
	body: z.object({
		name: z.string().min(2, 'Name is required'),
		description: z.string().optional(),
		iconUrl: z.string().url().optional(),
		wantsIconUpload: z.boolean().optional(),
	}),
});

export type CreateCommunityDto = z.infer<typeof createCommunitySchema>['body'];

export const updateCommunitySchema = z.object({
	body: z.object({
		name: z.string().min(2).optional(),
		description: z.string().optional(),
		iconUrl: z.string().url().optional(),
		joinRequiresApproval: z.boolean().optional(),
		addPermission: z.enum(['ANYONE', 'ADMIN']).optional(),
		deletePermission: z.enum(['ADMINS_AUTHORS', 'ADMIN']).optional(),
	}),
});

export type UpdateCommunityDto = z.infer<typeof updateCommunitySchema>['body'];

export const transferOwnershipSchema = z.object({
	body: z.object({
		newOwnerId: z.string().uuid('Invalid user ID'),
	}),
});

export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>['body'];


