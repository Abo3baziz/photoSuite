import { z } from 'zod';
import { SettingsSchema } from '../config/settings';

/**
 * Typed message protocol shared by the panel, background service worker, and
 * content scripts. Every message that crosses a context boundary must appear
 * here and be validated with Zod at the receiving boundary (AGENTS.md rule 4).
 */

// ---------------------------------------------------------------------------
// Requests: panel → background
// ---------------------------------------------------------------------------

export const PingRequestSchema = z.object({ type: z.literal('panel:ping') });

export const GetActiveTabInfoRequestSchema = z.object({
  type: z.literal('panel:getActiveTabInfo'),
});

export const InspectPageRequestSchema = z.object({
  type: z.literal('panel:inspectPage'),
});

export const GetSettingsRequestSchema = z.object({
  type: z.literal('panel:getSettings'),
});

export const SetSettingsRequestSchema = z.object({
  type: z.literal('panel:setSettings'),
  settings: SettingsSchema,
});

export const ResetSettingsRequestSchema = z.object({
  type: z.literal('panel:resetSettings'),
});

export const PanelRequestSchema = z.discriminatedUnion('type', [
  PingRequestSchema,
  GetActiveTabInfoRequestSchema,
  InspectPageRequestSchema,
  GetSettingsRequestSchema,
  SetSettingsRequestSchema,
  ResetSettingsRequestSchema,
]);

export type PanelRequest = z.infer<typeof PanelRequestSchema>;

// ---------------------------------------------------------------------------
// Requests: background → content script
// ---------------------------------------------------------------------------

export const ContentInspectPageRequestSchema = z.object({
  type: z.literal('content:inspectPage'),
});

export const ContentRequestSchema = z.discriminatedUnion('type', [ContentInspectPageRequestSchema]);

export type ContentRequest = z.infer<typeof ContentRequestSchema>;

// ---------------------------------------------------------------------------
// Shared payload schemas
// ---------------------------------------------------------------------------

/** What the active tab is, as judged by the background script. */
export const ActiveTabInfoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('auditable'),
    url: z.string().url(),
    origin: z.string(),
    title: z.string(),
    hasOriginPermission: z.boolean(),
  }),
  z.object({
    kind: z.literal('unsupported'),
    /** Null when Chrome restricts URL access entirely. */
    url: z.string().nullable(),
    reason: z.string(),
  }),
  z.object({
    kind: z.literal('inaccessible'),
    reason: z.string(),
  }),
]);

export type ActiveTabInfo = z.infer<typeof ActiveTabInfoSchema>;

/** Lightweight ISOLATED-world page inspection result (Milestone 1). */
export const InspectSummarySchema = z.object({
  url: z.string(),
  origin: z.string(),
  title: z.string(),
  counts: z.object({
    links: z.number(),
    buttons: z.number(),
    inputs: z.number(),
    textareas: z.number(),
    selects: z.number(),
    dialogs: z.number(),
  }),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    devicePixelRatio: z.number(),
  }),
});

export type InspectSummary = z.infer<typeof InspectSummarySchema>;
