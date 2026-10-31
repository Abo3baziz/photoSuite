import type { InspectSummary } from '../shared/messaging/protocol';
import { ContentRequestSchema } from '../shared/messaging/protocol';
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

import { discoverElements, discoverRoutesFromDocument } from './discovery/discovery';
import { installSpaObserver } from './observation/spaObserver';
import { ExclusionsSchema } from '../shared/config/settings';

function handleMessage(request: unknown): RpcResponse<unknown> | null {
  const parsed = ContentRequestSchema.safeParse(request);
  if (parsed.success) {
    const message = parsed.data;
    switch (message.type) {
      case 'content:inspectPage':
        try {
          return rpcOk(inspectPage());
        } catch {
          return rpcError('INSPECT_FAILED', 'The page could not be inspected.');
        }
    }
  }

  // Extended discovery messages (not part of the strict protocol union yet).
  const obj = request as { type?: unknown };
  if (typeof obj?.type !== 'string') return null;

  switch (obj.type) {
    case 'content:ping':
      return rpcOk({ ok: true });

    case 'content:discoverRoutes': {
      const payload = obj as { depth?: number; exclusions?: unknown };
      const depth = typeof payload.depth === 'number' ? payload.depth : 0;
      const exclusionsParsed = ExclusionsSchema.safeParse(payload.exclusions ?? {});
      const routeExclusions = exclusionsParsed.success ? exclusionsParsed.data.routes : [];
      try {
        const routes = discoverRoutesFromDocument(location.href, depth, routeExclusions);
        return rpcOk({ routes });
      } catch (error) {
        return rpcError('DISCOVERY_FAILED', error instanceof Error ? error.message : String(error));
      }
    }
  }

  return null;
}

if (!globalScope.__webUiAuditorInstalled) {
  globalScope.__webUiAuditorInstalled = true;
  installSpaObserver();
  chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
    const response = handleMessage(request);
    if (response) {
      sendResponse(response);
      return false;
    }
    // Async path: element discovery needs identity hashing.
    const obj = request as { type?: unknown };
    if (obj?.type === 'content:discoverElements') {
      const payload = obj as { shadowDepth?: number };
      const shadowDepth = typeof payload.shadowDepth === 'number' ? payload.shadowDepth : 3;
      void discoverElements(document, shadowDepth)
        .then((elements) => {
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          };
          sendResponse(rpcOk({ elements, viewport }));
        })
        .catch((error) =>
          sendResponse(
            rpcError('DISCOVERY_FAILED', error instanceof Error ? error.message : String(error)),
          ),
        );
      return true;
    }
    // SPA navigation relay from this same script is handled by spaObserver.
    return false;
  });
}
