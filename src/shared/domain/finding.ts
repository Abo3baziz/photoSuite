import { z } from 'zod';

export const FindingSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingSourceSchema = z.enum(['rule', 'diagnostic', 'screenshot']);
export type FindingSource = z.infer<typeof FindingSourceSchema>;

export const FindingSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  severity: FindingSeveritySchema,
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  evidence: z.object({
    screenshots: z.array(z.string()),
    diagnostics: z.array(z.string()),
    interactions: z.array(z.string()),
  }),
  reproductionSteps: z.array(z.string()),
  source: FindingSourceSchema,
  verified: z.boolean(),
  createdAt: z.number().int().nonnegative(),
});
export type Finding = z.infer<typeof FindingSchema>;
