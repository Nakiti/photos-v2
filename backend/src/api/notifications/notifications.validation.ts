import { z } from 'zod';

export const getNotificationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
    isRead: z.coerce.boolean().optional(),
  }),
});

export type GetNotificationsDto = z.infer<typeof getNotificationsSchema>['query'];

export const markAsReadSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid(),
  }),
});

export type MarkAsReadDto = z.infer<typeof markAsReadSchema>['params'];

