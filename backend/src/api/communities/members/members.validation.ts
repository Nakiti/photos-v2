import { z } from 'zod';

export const addMemberSchema = z.object({
	body: z.object({
		userId: z.string().uuid('Invalid user id'),
	}),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>['body'];











