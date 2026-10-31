import { z } from 'zod';

export const ScreenshotKindSchema = z.enum([
  'initial',
  'before',
  'after',
  'overlay',
  'stitched',
  'fallback',
]);
export type ScreenshotKind = z.infer<typeof ScreenshotKindSchema>;

export const ScreenshotSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  screenStateId: z.string().nullable(),
  interactionId: z.string().nullable(),
  kind: ScreenshotKindSchema,
  viewport: z.object({
    width: z.number().int(),
    height: z.number().int(),
    devicePixelRatio: z.number(),
  }),
  scroll: z.object({ x: z.number(), y: z.number() }),
  dpr: z.number(),
  dimensions: z.object({ width: z.number().int(), height: z.number().int() }),
  sha256: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
});
export type Screenshot = z.infer<typeof ScreenshotSchema>;

export const ScreenshotBlobSchema = z.object({
  id: z.string().min(1),
  data: z.instanceof(Blob),
  sha256: z.string().min(1),
});
export type ScreenshotBlob = z.infer<typeof ScreenshotBlobSchema>;
