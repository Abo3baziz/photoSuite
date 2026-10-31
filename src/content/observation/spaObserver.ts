/**
 * SPA navigation observation + lightweight mutation observation.
 * Reports same-origin URL changes to the background via a typed message.
 * The override of history methods is idempotent (guarded by a window flag).
 */

declare global {
  interface Window {
    __webUiAuditorSpaInstalled?: boolean;
  }
}

export interface SpaNavigationEvent {
  readonly url: string;
  readonly occurredAt: number;
}

type SpaCallback = (event: SpaNavigationEvent) => void;

const callbacks = new Set<SpaCallback>();

export function onSpaNavigation(callback: SpaCallback): () => void {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}

function emit(url: string): void {
  const event: SpaNavigationEvent = { url, occurredAt: Date.now() };
  for (const cb of callbacks) cb(event);
  try {
    void chrome.runtime.sendMessage({
      type: 'content:spaNavigation',
      url,
      occurredAt: event.occurredAt,
    });
  } catch {
    /* background may be unavailable; observers are best-effort */
  }
}

export function installSpaObserver(): void {
  if (window.__webUiAuditorSpaInstalled) return;
  window.__webUiAuditorSpaInstalled = true;

  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);

  history.pushState = function patchedPushState(...args: Parameters<typeof history.pushState>) {
    const result = originalPush(...args);
    // Defer so the URL is updated before emitting.
    queueMicrotask(() => emit(location.href));
    return result;
  };

  history.replaceState = function patchedReplaceState(
    ...args: Parameters<typeof history.replaceState>
  ) {
    const result = originalReplace(...args);
    queueMicrotask(() => emit(location.href));
    return result;
  };

  window.addEventListener('popstate', () => emit(location.href));
  window.addEventListener('hashchange', () => emit(location.href));
}

/**
 * Debounced mutation observer that fires `onSettled` when the DOM stops
 * changing for `quietMs`. Used to wait for dynamic content before discovery.
 */
export function observeUntilSettled(
  root: Node,
  quietMs: number,
  onSettled: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const observer = new MutationObserver(() => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (stopped) return;
      onSettled();
    }, quietMs);
  });

  observer.observe(root, { childList: true, subtree: true, attributes: false });

  // Initial settle timer.
  timer = setTimeout(() => {
    if (!stopped) onSettled();
  }, quietMs);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    observer.disconnect();
  };
}
