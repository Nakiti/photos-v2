import { z } from 'zod';

export const applyTagSchema = z.object({
  body: z.object({
    tagId: z.string().min(1, 'tagId is required'),
  }),
});

export type ApplyTagDto = z.infer<typeof applyTagSchema>['body'];


