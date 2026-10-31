import type { ActiveTabInfo } from '../../shared/messaging/protocol';
import { classifyUnsupportedPage, isWebUrl, originPermissionPattern } from '../../shared/url/rules';

/** Resolve the audited target: the active tab of the last focused window. */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab ?? null;
}

async function hasOriginPermission(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  return chrome.permissions.contains({ origins: [pattern] });
}

/**
 * Describe whether the active tab is auditable, and where it is. Never throws;
 * unsupported situations arrive as typed verdicts with plain-language reasons
 * (FR-01: "Display unsupported-page errors clearly").
 */
export async function getActiveTabInfo(): Promise<ActiveTabInfo> {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return { kind: 'inaccessible', reason: 'No active browser tab was found to inspect.' };
  }

  const url = tab.url ?? tab.pendingUrl ?? '';
  const title = tab.title ?? '';
  if (!isWebUrl(url)) {
    const classified = classifyUnsupportedPage(url);
    return { kind: 'unsupported', url: url === '' ? null : url, reason: classified?.reason ?? 'This page type cannot be audited.' };
  }

  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(url).origin;
  } catch {
    return { kind: 'unsupported', url, reason: 'The tab URL could not be parsed as a web address.' };
  }

  return {
    kind: 'auditable',
    url,
    origin: parsedOrigin,
    title,
    hasOriginPermission: await hasOriginPermission(parsedOrigin),
  };
}
