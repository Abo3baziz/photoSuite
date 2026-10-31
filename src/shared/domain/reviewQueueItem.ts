import { z } from 'zod';

export const ReviewQueueStatusSchema = z.enum(['queued', 'approved', 'dismissed']);
export type ReviewQueueStatus = z.infer<typeof ReviewQueueStatusSchema>;

export const ReviewQueueItemSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  elementId: z.string().min(1),
  status: ReviewQueueStatusSchema,
  reason: z.string(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;
