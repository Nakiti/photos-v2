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

// Schema for searching friends
export const searchFriendsSchema = z.object({
  query: z.object({
    search: z.string().optional(), // General search term (searches friend's name, email, handle)
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
  }),
});

export type SearchFriendsDto = z.infer<typeof searchFriendsSchema>['query'];

