import { z } from 'zod';

export const DiagnosticSeveritySchema = z.enum(['info', 'warn', 'error']);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const DiagnosticCategorySchema = z.enum([
  'js-error',
  'rejection',
  'console-error',
  'network-failed',
  'http-error',
  'navigation-failure',
  'interaction-failure',
  'observation',
]);
export type DiagnosticCategory = z.infer<typeof DiagnosticCategorySchema>;

export const DiagnosticEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  screenStateId: z.string().nullable(),
  interactionId: z.string().nullable(),
  routeId: z.string().nullable(),
  severity: DiagnosticSeveritySchema,
  category: DiagnosticCategorySchema,
  message: z.string(),
  detail: z.string().nullable(),
  occurredAt: z.number().int().nonnegative(),
});
export type DiagnosticEvent = z.infer<typeof DiagnosticEventSchema>;
