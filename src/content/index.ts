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

import { ExclusionsSchema } from '../shared/config/settings';
import { discoverElements, discoverRoutesFromDocument } from './discovery/discovery';
import { installSpaObserver } from './observation/spaObserver';
import { executeAction } from './interaction/actions';

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

    case 'content:executeAction': {
      const payload = obj as { css?: unknown; actionType?: unknown; params?: unknown };
      const css = typeof payload.css === 'string' ? payload.css : '';
      const actionType = payload.actionType as 'click' | 'type' | 'select' | 'toggle' | 'focus' | 'keyboard' | 'scroll';
      const params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as { value?: string; key?: string; scrollX?: number; scrollY?: number };
      // executeAction is async (stability wait); handle via async path below.
      void css;
      void actionType;
      void params;
      return null;
    }

    case 'content:getViewportInfo': {
      return rpcOk({
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      });
    }

    case 'content:scrollForCapture': {
      const payload = obj as { x?: number; y?: number };
      const x = typeof payload.x === 'number' ? payload.x : 0;
      const y = typeof payload.y === 'number' ? payload.y : 0;
      window.scrollTo(x, y);
      return rpcOk({ ok: true });
    }

    case 'content:suppressFixed': {
      const payload = obj as { enabled?: boolean };
      const enabled = payload.enabled === true;
      const styleId = 'web-ui-auditor-suppress-fixed';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (enabled) {
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          style.textContent = 'html.web-ui-auditor-suppress *, body.web-ui-auditor-suppress * { position: static !important; }';
          document.head.appendChild(style);
        }
        document.documentElement.classList.add('web-ui-auditor-suppress');
        document.body.classList.add('web-ui-auditor-suppress');
      } else {
        document.documentElement.classList.remove('web-ui-auditor-suppress');
        document.body.classList.remove('web-ui-auditor-suppress');
        style?.remove();
      }
      return rpcOk({ ok: true });
    }

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
    // Async path: action execution needs stability wait.
    if (obj?.type === 'content:executeAction') {
      const payload = obj as { css?: unknown; actionType?: unknown; params?: unknown };
      const css = typeof payload.css === 'string' ? payload.css : '';
      const actionType = payload.actionType as
        | 'click'
        | 'type'
        | 'select'
        | 'toggle'
        | 'focus'
        | 'keyboard'
        | 'scroll';
      const params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as {
        value?: string;
        key?: string;
        scrollX?: number;
        scrollY?: number;
      };
      void executeAction(css, actionType, params)
        .then((result) => sendResponse(rpcOk(result)))
        .catch((error) =>
          sendResponse(rpcError('ACTION_FAILED', error instanceof Error ? error.message : String(error))),
        );
      return true;
    }
  });
}
