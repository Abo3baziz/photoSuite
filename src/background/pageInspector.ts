import type { InspectSummary, ActiveTabInfo } from '../shared/messaging/protocol';
import {
  ContentInspectPageRequestSchema,
  InspectSummarySchema,
} from '../shared/messaging/protocol';
import { DomainError, rpcError, rpcOk, type RpcResponse } from '../shared/messaging/rpc';
import { getActiveTab, getActiveTabInfo } from './tabs/tabInspector';

/**
 * Injects the (idempotent) ISOLATED-world content script into the active,
 * permission-granted tab and asks it to inspect the page. M1 scope only; the
 * audit engine drives the same injection point from Milestone 2 on.
 */

const CONTENT_SCRIPT_FILE = 'content.js';

export type PageInspectFailureCode =
  | 'NO_ACTIVE_TAB'
  | 'UNSUPPORTED_PAGE'
  | 'NEEDS_ORIGIN_PERMISSION'
  | 'INJECTION_FAILED'
  | 'INSPECT_TIMEOUT';

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
  } catch (error) {
    throw new DomainError(
      'INJECTION_FAILED',
      `Could not inject the auditor into this page.`,
      asMessage(error),
    );
  }
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestInspect(tabId: number): Promise<InspectSummary> {
  const request = ContentInspectPageRequestSchema.parse({ type: 'content:inspectPage' });
  const raw = (await chrome.tabs.sendMessage(tabId, request)) as unknown;
  const envelope = raw as RpcResponse<unknown> | undefined;
  if (!envelope || typeof envelope !== 'object' || !('ok' in envelope)) {
    throw new DomainError('INJECTION_FAILED', 'The auditor content script did not respond.');
  }
  if (!envelope.ok) {
    throw new DomainError('INSPECT_FAILED', envelope.error.message);
  }
  return InspectSummarySchema.parse(envelope.data);
}

/** Full sequence: locate tab → verify grants → inject → inspect. */
export async function inspectActiveTab(): Promise<RpcResponse<InspectSummary>> {
  const info: ActiveTabInfo = await getActiveTabInfo();

  if (info.kind === 'inaccessible') {
    return rpcError('NO_ACTIVE_TAB', info.reason);
  }
  if (info.kind === 'unsupported') {
    return rpcError('UNSUPPORTED_PAGE', info.reason, { url: info.url });
  }
  if (!info.hasOriginPermission) {
    return rpcError(
      'NEEDS_ORIGIN_PERMISSION',
      'This origin has not been granted host access yet. Grant access, then inspect.',
      {
        origin: info.origin,
      },
    );
  }

  const tab = await getActiveTab();
  const tabId = tab?.id;
  if (!tabId)
    return rpcError('NO_ACTIVE_TAB', 'The active tab closed while starting the inspection.');

  try {
    await ensureContentScript(tabId);
  } catch (error) {
    if (error instanceof DomainError) return rpcError(error.code, error.message, error.details);
    return rpcError('INJECTION_FAILED', 'Could not inject the auditor into this page.');
  }

  try {
    const summary = await withTimeout(
      requestInspect(tabId),
      5_000,
      'INSPECT_TIMEOUT',
      'The page inspection timed out.',
    );
    return rpcOk(summary);
  } catch (error) {
    if (error instanceof DomainError) return rpcError(error.code, error.message, error.details);
    return rpcError(
      'INSPECT_FAILED',
      'The inspection response could not be validated.',
      asMessage(error),
    );
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  code: string,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DomainError(code, message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
