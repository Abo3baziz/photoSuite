import { originPermissionPattern } from '../../shared/url/rules';

/**
 * Origin permission helpers that run in the panel context (an extension page),
 * because `chrome.permissions.request` must be called from a user gesture.
 */

export function isWebOrigin(origin: string): boolean {
  return originPermissionPattern(origin) !== null;
}

export async function isOriginGranted(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  return chrome.permissions.contains({ origins: [pattern] });
}

export async function grantOriginPermission(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  if (await chrome.permissions.contains({ origins: [pattern] })) return true;
  return chrome.permissions.request({ origins: [pattern] });
}
