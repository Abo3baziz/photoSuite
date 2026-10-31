import { z } from 'zod';

export const ScreenStateSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  routeId: z.string().min(1),
  url: z.string().url(),
  fingerprint: z.string().min(1),
  isOverlayActive: z.boolean(),
  viewport: z.object({
    width: z.number().int(),
    height: z.number().int(),
    devicePixelRatio: z.number(),
  }),
  discoveredAt: z.number().int().nonnegative(),
});
export type ScreenState = z.infer<typeof ScreenStateSchema>;
export type NewScreenState = Omit<ScreenState, 'id' | 'discoveredAt'> & { discoveredAt?: number };
