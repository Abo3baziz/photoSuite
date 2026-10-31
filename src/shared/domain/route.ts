import { z } from 'zod';

export const RouteKindSchema = z.enum(['document', 'spa']);
export type RouteKind = z.infer<typeof RouteKindSchema>;

export const RouteStatusSchema = z.enum(['pending', 'visited', 'blocked', 'excluded', 'failed']);
export type RouteStatus = z.infer<typeof RouteStatusSchema>;

export const RouteSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  url: z.string().url(),
  normalizedKey: z.string().min(1),
  kind: RouteKindSchema,
  status: RouteStatusSchema,
  depth: z.number().int().min(0),
  discoveredVia: z.string().min(1),
  firstSeenAt: z.number().int().nonnegative(),
  lastVisitedAt: z.number().int().nonnegative().nullable(),
});
export type Route = z.infer<typeof RouteSchema>;
export type NewRoute = Omit<Route, 'id' | 'firstSeenAt' | 'lastVisitedAt'> & {
  firstSeenAt?: number;
};
