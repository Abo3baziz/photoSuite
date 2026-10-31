/**
 * Typed action executors (FR-05, FR-06). Each executor re-resolves the target
 * from a CSS selector, re-checks existence/visibility/enabled state, performs
 * the action, waits for observable stability, and reports the outcome. Actions
 * are idempotent-safe: re-running on a missing target returns `not-found`.
 */

export type ActionType = 'click' | 'type' | 'select' | 'toggle' | 'focus' | 'keyboard' | 'scroll';

export interface ActionParams {
  readonly value?: string;
  readonly key?: string;
  readonly scrollX?: number;
  readonly scrollY?: number;
}

export interface ActionResult {
  readonly ok: boolean;
  readonly actionType: ActionType;
  readonly durationMs: number;
  readonly error: string | null;
  readonly stateChanged: boolean;
}

function resolve(css: string): Element | null {
  try {
    return document.querySelector(css);
  } catch {
    return null;
  }
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
}

function isEnabled(el: Element): boolean {
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return !el.disabled;
  }
  return el.getAttribute('aria-disabled') !== 'true';
}

function waitForStability(quietMs: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve(true);
      }, quietMs);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      resolve(true);
    }, quietMs);
    // Hard cap.
    setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      if (timer) clearTimeout(timer);
      resolve(false);
    }, timeoutMs);
  });
}

function guard(css: string): { el: Element } | { error: string } {
  const el = resolve(css);
  if (!el) return { error: 'target not found' };
  if (!isVisible(el)) return { error: 'target not visible' };
  if (!isEnabled(el)) return { error: 'target disabled' };
  return { el };
}

export async function executeAction(css: string, actionType: ActionType, params: ActionParams): Promise<ActionResult> {
  const started = Date.now();
  const g = guard(css);
  if ('error' in g) {
    return { ok: false, actionType, durationMs: Date.now() - started, error: g.error, stateChanged: false };
  }
  const { el } = g;

  // Snapshot a cheap fingerprint of the DOM before acting.
  const before = document.documentElement.outerHTML.length;

  try {
    switch (actionType) {
      case 'click':
        (el as HTMLElement).click();
        break;
      case 'focus':
        (el as HTMLElement).focus();
        break;
      case 'type': {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus();
          el.value = params.value ?? '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el.getAttribute('contenteditable') === 'true') {
          el.textContent = params.value ?? '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          return { ok: false, actionType, durationMs: Date.now() - started, error: 'target is not editable', stateChanged: false };
        }
        break;
      }
      case 'select': {
        if (el instanceof HTMLSelectElement) {
          el.value = params.value ?? '';
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          return { ok: false, actionType, durationMs: Date.now() - started, error: 'target is not a select', stateChanged: false };
        }
        break;
      }
      case 'toggle': {
        if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
          el.checked = !el.checked;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          (el as HTMLElement).click();
        }
        break;
      }
      case 'keyboard': {
        const key = params.key ?? 'Enter';
        el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        break;
      }
      case 'scroll': {
        const x = params.scrollX ?? 0;
        const y = params.scrollY ?? 0;
        el.scrollBy?.(x, y);
        window.scrollBy(x, y);
        break;
      }
    }
  } catch (error) {
    return { ok: false, actionType, durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error), stateChanged: false };
  }

  await waitForStability(250, 2000);
  const after = document.documentElement.outerHTML.length;
  const stateChanged = before !== after;

  return { ok: true, actionType, durationMs: Date.now() - started, error: null, stateChanged };
}
