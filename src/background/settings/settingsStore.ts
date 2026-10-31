import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from '../../shared/config/settings';
import { DomainError } from '../../shared/messaging/rpc';

/**
 * Settings persistence backed by chrome.storage.local, Zod-validated on both
 * read and write paths. Corruption falls back to defaults (documented behavior)
 * rather than crashing the worker.
 */

const SETTINGS_KEY = 'settings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const candidate = isRecord(stored) ? { ...DEFAULT_SETTINGS, ...stored, version: 1 } : {};
  const parsed = SettingsSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  // Corrupt or partially valid stored settings: fall back to defaults rather
  // than failing the session path. The invalid copy is overwritten on next save.
  console.warn('[web-ui-auditor] stored settings failed validation; using defaults', parsed.error.issues.slice(0, 3));
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(input: unknown): Promise<Settings> {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError('INVALID_SETTINGS', 'The provided settings are not valid.', parsed.error.issues);
  }
  await chrome.storage.local.set({ [SETTINGS_KEY]: parsed.data });
  return parsed.data;
}

export async function resetSettings(): Promise<Settings> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}
