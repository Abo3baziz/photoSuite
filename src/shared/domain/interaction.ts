import { z } from 'zod';

export const InteractionActionTypeSchema = z.enum([
  'click',
  'type',
  'select',
  'toggle',
  'focus',
  'keyboard',
  'scroll',
]);
export type InteractionActionType = z.infer<typeof InteractionActionTypeSchema>;

export const InteractionStatusSchema = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
  'skipped',
]);
export type InteractionStatus = z.infer<typeof InteractionStatusSchema>;

export const InteractionSkipReasonSchema = z.enum([
  'risk',
  'duplicate-state',
  'not-visible',
  'disabled',
  'permission',
  'excluded',
  'timeout',
  'other',
]);
export type InteractionSkipReason = z.infer<typeof InteractionSkipReasonSchema>;

export const InteractionSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  targetElementId: z.string().min(1),
  screenStateId: z.string().min(1),
  actionType: InteractionActionTypeSchema,
  params: z.record(z.string(), z.unknown()),
  status: InteractionStatusSchema,
  skipReason: InteractionSkipReasonSchema.nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
  beforeScreenshotId: z.string().nullable(),
  afterScreenshotId: z.string().nullable(),
  uiStateIdAfter: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type Interaction = z.infer<typeof InteractionSchema>;
export type NewInteraction = Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};
