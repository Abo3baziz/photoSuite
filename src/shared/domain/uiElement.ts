import { z } from 'zod';

export const ElementRiskClassSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ElementRiskClass = z.infer<typeof ElementRiskClassSchema>;

export const UIElementSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  screenStateId: z.string().min(1),
  role: z.string().min(1),
  tag: z.string().min(1),
  accessibleName: z.string().nullable(),
  identityHash: z.string().min(1),
  riskClass: ElementRiskClassSchema,
  selectors: z.object({ css: z.string(), xpath: z.string().nullable() }),
  locator: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  enabled: z.boolean(),
  visible: z.boolean(),
  iframeKey: z.string().nullable(),
});
export type UIElement = z.infer<typeof UIElementSchema>;
export type NewUIElement = Omit<UIElement, 'id'>;
