import { z } from 'zod';

export const StateTransitionSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  fromStateId: z.string().min(1),
  toStateId: z.string().min(1),
  interactionId: z.string().min(1).nullable(),
  observedAt: z.number().int().nonnegative(),
});
export type StateTransition = z.infer<typeof StateTransitionSchema>;
