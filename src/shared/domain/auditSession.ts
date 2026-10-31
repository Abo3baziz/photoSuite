import { z } from 'zod';

export const AuditSessionStatusSchema = z.enum([
  'running',
  'paused',
  'interrupted',
  'completed',
  'failed',
]);
export type AuditSessionStatus = z.infer<typeof AuditSessionStatusSchema>;

export const AuditSessionSchema = z.object({
  id: z.string().min(1),
  origin: z.string().url(),
  startUrl: z.string().url(),
  status: AuditSessionStatusSchema,
  statusReason: z.string().nullable(),
  startedAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  limits: z.object({
    maxRoutes: z.number().int(),
    maxActions: z.number().int(),
    maxVisitsPerState: z.number().int(),
    maxDepth: z.number().int(),
    actionTimeoutMs: z.number().int(),
    retryCount: z.number().int(),
    sessionTimeoutMs: z.number().int(),
  }),
});
export type AuditSession = z.infer<typeof AuditSessionSchema>;
export const NewAuditSessionSchema = AuditSessionSchema.omit({
  id: true,
  startedAt: true,
  updatedAt: true,
});
export type NewAuditSession = z.infer<typeof NewAuditSessionSchema>;
