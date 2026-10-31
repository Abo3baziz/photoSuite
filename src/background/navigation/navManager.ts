import { getActiveTab } from '../tabs/tabInspector';

/**
 * Navigation management for the audited tab. Handles navigation, load
 * completion, and re-injection of the content script into granted origins.
 */
export interface NavigationResult {
  readonly ok: boolean;
  readonly url: string;
  readonly reason?: string;
}

const LOAD_TIMEOUT_MS = 15_000;

export async function navigateTab(tabId: number, url: string): Promise<NavigationResult> {
  try {
    await chrome.tabs.update(tabId, { url });
  } catch (error) {
    return { ok: false, url, reason: error instanceof Error ? error.message : String(error) };
  }

  // Wait for the tab to finish loading (or time out).
  const started = Date.now();
  while (Date.now() - started < LOAD_TIMEOUT_MS) {
    let tab: chrome.tabs.Tab | undefined;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      return { ok: false, url, reason: 'tab closed during navigation' };
    }
    if (tab.status === 'complete') {
      const finalUrl = tab.url ?? url;
      if (finalUrl.startsWith('chrome-error://')) {
        return { ok: false, url: finalUrl, reason: 'navigation failed (chrome error page)' };
      }
      return { ok: true, url: finalUrl };
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { ok: false, url, reason: 'navigation timed out' };
}

export async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return true;
  } catch {
    return false;
  }
}

export async function ensureContentScript(tabId: number): Promise<boolean> {
  // Try a ping first; inject only if the script is not already present.
  try {
    const response = (await chrome.tabs.sendMessage(tabId, { type: 'content:ping' })) as
      { ok?: boolean } | undefined;
    if (response && response.ok === true) return true;
  } catch {
    /* not injected yet */
  }
  return injectContentScript(tabId);
}

export async function getAuditedTabId(): Promise<number | null> {
  const tab = await getActiveTab();
  return tab?.id ?? null;
}
