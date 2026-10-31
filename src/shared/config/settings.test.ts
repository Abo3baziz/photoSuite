import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, ExplorationLimitsSchema, SettingsSchema } from './settings';

describe('ExplorationLimitsSchema', () => {
  it('matches the spec §6 defaults', () => {
    const limits = ExplorationLimitsSchema.parse({});
    expect(limits).toEqual({
      maxRoutes: 100,
      maxActions: 500,
      maxVisitsPerState: 3,
      maxDepth: 10,
      actionTimeoutMs: 10_000,
      retryCount: 2,
      sessionTimeoutMs: 300_000 * 6, // 30 minutes
    });
  });

  it('rejects out-of-range values', () => {
    expect(ExplorationLimitsSchema.safeParse({ maxRoutes: 0 }).success).toBe(false);
    expect(ExplorationLimitsSchema.safeParse({ retryCount: -1 }).success).toBe(false);
    expect(ExplorationLimitsSchema.safeParse({ actionTimeoutMs: 10 }).success).toBe(false);
    expect(ExplorationLimitsSchema.safeParse({ sessionTimeoutMs: 999 }).success).toBe(false);
  });

  it('keeps integers only', () => {
    expect(ExplorationLimitsSchema.safeParse({ maxDepth: 2.5 }).success).toBe(false);
  });
});

describe('SettingsSchema', () => {
  it('produces consistent defaults', () => {
    const a = SettingsSchema.parse({});
    const b = DEFAULT_SETTINGS;
    expect(a).toEqual(b);
    expect(a.version).toBe(1);
    expect(a.exploration.maxVisitsPerState).toBe(3);
    expect(a.capture.fullPage).toBe(true);
    expect(a.exclusions.routes).toEqual([]);
    expect(a.exclusions.elements).toEqual([]);
  });

  it('accepts full user overrides and fills missing fields', () => {
    const settings = SettingsSchema.parse({
      exploration: { maxRoutes: 20, maxActions: 10 },
      capture: { fullPage: false },
      exclusions: { routes: ['/admin', '/logout'], elements: ['delete'] },
    });
    expect(settings.exploration.maxRoutes).toBe(20);
    expect(settings.exploration.maxActions).toBe(10);
    expect(settings.exploration.maxDepth).toBe(10); // default retained
    expect(settings.capture.fullPage).toBe(false);
    expect(settings.exclusions.routes).toEqual(['/admin', '/logout']);
  });

  it('rejects unknown version labels and junk exclusion shapes', () => {
    expect(SettingsSchema.safeParse({ version: 2 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ exclusions: { routes: '' } }).success).toBe(false);
  });
});
