import { z } from 'zod';

/**
 * Exploration limits (spec §6). Defaults follow the spec's table exactly and
 * are user-configurable through the Settings page.
 */
export const ExplorationLimitsSchema = z.object({
  maxRoutes: z.number().int().min(1).max(10_000).default(100),
  maxActions: z.number().int().min(1).max(50_000).default(500),
  maxVisitsPerState: z.number().int().min(1).max(100).default(3),
  maxDepth: z.number().int().min(1).max(100).default(10),
  actionTimeoutMs: z.number().int().min(1_000).max(120_000).default(10_000),
  retryCount: z.number().int().min(0).max(10).default(2),
  sessionTimeoutMs: z.number().int().min(60_000).max(86_400_000).default(1_800_000), // 30 minutes
});

export type ExplorationLimits = z.infer<typeof ExplorationLimitsSchema>;

/**
 * Screenshot settings. `fullPage` enables scroll-and-stitch capture with
 * fixed-element suppression; viewport capture always happens (FR-07 fallback).
 */
export const CaptureSettingsSchema = z.object({
  fullPage: z.boolean().default(true),
});

/**
 * Route exclusions are path prefixes (normalized paths), e.g. `/admin`,
 * `/logout`, `/wp-login.php`. Element exclusions are case-insensitive substring
 * rules applied to controls' accessible names, e.g. `delete`, `pay`.
 */
export const ExclusionsSchema = z.object({
  routes: z.array(z.string().min(1).max(2_000)).max(200).default([]),
  elements: z.array(z.string().min(1).max(200)).max(200).default([]),
});

export const SettingsSchema = z.object({
  version: z.literal(1).default(1),
  exploration: ExplorationLimitsSchema.prefault({}),
  capture: CaptureSettingsSchema.prefault({}),
  exclusions: ExclusionsSchema.prefault({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_VERSION = 1;

/** Canonical defaults (used on install, after corrupt reads, and by Reset). */
export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
