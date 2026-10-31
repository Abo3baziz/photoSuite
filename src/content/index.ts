import type { ContentRequest } from '../shared/messaging/protocol';
import { ContentRequestSchema } from '../shared/messaging/protocol';
import type { InspectSummary } from '../shared/messaging/protocol';
import { rpcError, rpcOk, type RpcResponse } from '../shared/messaging/rpc';

/**
 * ISOLATED-world content script (Milestone 1 scope): page inspection.
 * Deliberately lightweight (AGENTS.md 9). Injury-free by construction: no
 * writes to page state, no global listeners beyond the one message channel.
 * The injection is idempotent — guarded by a window flag.
 */

const globalScope = globalThis as typeof globalThis & { __webUiAuditorInstalled?: boolean };

function inspectPage(): InspectSummary {
  return {
    url: location.href,
    origin: location.origin,
    title: document.title,
    counts: {
      links: document.querySelectorAll('a[href]').length,
      buttons: document.querySelectorAll(
        'button, [role=button], input[type=button], input[type=submit]',
      ).length,
      inputs: document.querySelectorAll('input:not([type=hidden])').length,
      textareas: document.querySelectorAll('textarea').length,
      selects: document.querySelectorAll('select').length,
      dialogs: document.querySelectorAll('dialog[open], [role=dialog], [aria-modal=true]').length,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
  };
}

function handleMessage(request: unknown): RpcResponse<unknown> | null {
  const parsed = ContentRequestSchema.safeParse(request);
  if (!parsed.success) return null;
  const message: ContentRequest = parsed.data;
  switch (message.type) {
    case 'content:inspectPage':
      try {
        return rpcOk(inspectPage());
      } catch {
        return rpcError('INSPECT_FAILED', 'The page could not be inspected.');
      }
  }
}

if (!globalScope.__webUiAuditorInstalled) {
  globalScope.__webUiAuditorInstalled = true;
  chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
    const response = handleMessage(request);
    if (response) {
      sendResponse(response);
      return false; // synchronous reply
    }
    return false;
  });
}
