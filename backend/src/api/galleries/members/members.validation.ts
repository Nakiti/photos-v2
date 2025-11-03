import { z } from 'zod';

/**
 * Schema for adding a member to a gallery.
 * Body must contain a valid UUID `userId`.
 */
export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user id'),
  }),
});

/**
 * DTO inferred from `addMemberSchema` body.
 */
export type AddMemberDto = z.infer<typeof addMemberSchema>['body'];

/**
 * Schema for inviting a user to a gallery.
 * Body must contain a valid UUID `userIdToInvite`.
 */
export const inviteMemberSchema = z.object({
  body: z.object({
    userIdToInvite: z.string().uuid('Invalid user id'),
  }),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>['body'];


/**
 * Schema for updating the current user's membership in a gallery.
 * Body may include preferences like `isMuted`.
 */
export const updateMyMembershipSchema = z.object({
  body: z.object({
    isMuted: z.boolean(),
  }),
});

export type UpdateMyMembershipDto = z.infer<typeof updateMyMembershipSchema>['body'];

/**
 * Schema for validating params of GET my membership.
 */
export const getMyMembershipParamsSchema = z.object({
  params: z.object({
    galleryId: z.string().uuid('Invalid gallery id'),
  }),
});

