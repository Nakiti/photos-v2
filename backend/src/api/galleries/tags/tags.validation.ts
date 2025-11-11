import { z } from 'zod';

export const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
    color: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex code')
      .optional(),
  }),
});

export const updateTagSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(50).optional(),
      color: z
        .string()
        .regex(/^#?[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex code')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

export type CreateTagDto = z.infer<typeof createTagSchema>['body'];
export type UpdateTagDto = z.infer<typeof updateTagSchema>['body'];


