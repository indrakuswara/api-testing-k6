import { z } from 'zod';

export const apiObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.unknown().nullable().optional(),
});

export const apiObjectListSchema = z.array(apiObjectSchema);

export const deleteResponseSchema = z.object({
  message: z.string(),
});
