import { z } from 'zod';

export const sendRequestSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid(),
  }),
});

export const acceptRequestSchema = z.object({
  params: z.object({
    requesterId: z.string().uuid(),
  }),
});

export const cancelOrRejectSchema = z.object({
  params: z.object({
    otherUserId: z.string().uuid(),
  }),
});

export const removeFriendSchema = z.object({
  params: z.object({
    friendUserId: z.string().uuid(),
  }),
});

export type SendRequestDto = z.infer<typeof sendRequestSchema>['body'];

