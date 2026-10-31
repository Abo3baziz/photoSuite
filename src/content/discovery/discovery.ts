import { computeAccessibleName } from '../../shared/dom/accessibleName';
import { identityHash } from '../../shared/fingerprint/identity';
import { isDangerousRoute } from '../../shared/safety/dangerousRoutes';
import { isExcludedRoute } from '../../shared/url/rules';
import { normalizeUrl, sameOrigin } from '../../shared/url/rules';

export interface DiscoveredRoute {
  readonly url: string;
  readonly normalizedKey: string;
  readonly kind: 'document' | 'spa';
  readonly discoveredVia: string;
  readonly depth: number;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="link"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="treeitem"]',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (Number(style.opacity) === 0) return false;
  return true;
}

function isEnabled(el: Element): boolean {
  if (
    el instanceof HTMLButtonElement ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    return !el.disabled;
  }
  if (el.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

function nativeRole(tag: string, type: string | null): string {
  const t = tag.toLowerCase();
  if (t === 'a') return 'link';
  if (t === 'button') return 'button';
  if (t === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'submit' || type === 'button' || type === 'reset') return 'button';
    return 'textbox';
  }
  if (t === 'textarea') return 'textbox';
  if (t === 'select') return 'combobox';
  if (t === 'summary') return 'button';
  return t;
}

function cssPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current.nodeType === 1 && depth < 6) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameTagSiblings = Array.from(parent.children).filter(
      (c) => c.tagName === current!.tagName,
    );
    if (sameTagSiblings.length === 1) {
      parts.unshift(tag);
    } else {
      const index = sameTagSiblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-of-type(${index})`);
    }
    current = parent;
    depth += 1;
  }
  return parts.join(' > ');
}

function xpathFor(): string | null {
  // Minimal, best-effort; full XPath is expensive and rarely needed for M2.
  return null;
}

function collectShadowRoots(
  root: Document | ShadowRoot,
  depth: number,
  acc: (Document | ShadowRoot)[],
): void {
  if (depth <= 0) return;
  const walker = document.createTreeWalker(root as unknown as Node, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const el = node as Element;
    if (el.shadowRoot) {
      acc.push(el.shadowRoot);
      collectShadowRoots(el.shadowRoot, depth - 1, acc);
    }
    node = walker.nextNode();
  }
}

export interface DiscoveredElementInput {
  readonly tag: string;
  readonly role: string;
  readonly accessibleName: string | null;
  readonly identityHash: string;
  readonly riskInputs: {
    readonly isInForm: boolean;
    readonly formMethod: string | null;
    readonly formAction: string | null;
    readonly sectionText: string;
    readonly inputType: string | null;
  };
  readonly selectors: { readonly css: string; readonly xpath: string | null };
  readonly locator: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly iframeKey: string | null;
}

export async function discoverElements(
  root: Document,
  shadowDepth = 3,
): Promise<DiscoveredElementInput[]> {
  const roots: (Document | ShadowRoot)[] = [root];
  collectShadowRoots(root, shadowDepth, roots);

  const collected: Element[] = [];
  const seen = new Set<Element>();
  for (const r of roots) {
    for (const el of Array.from(r.querySelectorAll(INTERACTIVE_SELECTOR))) {
      if (seen.has(el)) continue;
      seen.add(el);
      collected.push(el);
    }
  }

  const results: DiscoveredElementInput[] = [];
  for (const el of collected) {
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type');
    const roleAttr = el.getAttribute('role');
    const role = roleAttr && roleAttr.trim() !== '' ? roleAttr.trim() : nativeRole(tag, type);

    const form = el.closest('form');
    const isInForm = form !== null;
    const formMethod = form ? form.getAttribute('method') : null;
    const formAction = form ? form.getAttribute('action') : null;

    // Section text: nearest section/fieldset/aria-labelledby container, capped.
    const container = el.closest('section, fieldset, [aria-labelledby], article, main, div');
    const sectionText = (container?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);

    const rect = el.getBoundingClientRect();
    const identity = await identityHash([
      role,
      computeAccessibleName({
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledByText: null,
        labelForText: null,
        title: el.getAttribute('title'),
        placeholder: el.getAttribute('placeholder'),
        alt: el.getAttribute('alt'),
        value: (el as HTMLInputElement).value ?? null,
        textContent: el.textContent,
        role,
        tag,
        type,
      }),
      tag,
      cssPath(el),
    ]);

    const accessibleName = computeAccessibleName({
      ariaLabel: el.getAttribute('aria-label'),
      ariaLabelledByText: null,
      labelForText: null,
      title: el.getAttribute('title'),
      placeholder: el.getAttribute('placeholder'),
      alt: el.getAttribute('alt'),
      value: (el as HTMLInputElement).value ?? null,
      textContent: el.textContent,
      role,
      tag,
      type,
    });

    results.push({
      tag,
      role,
      accessibleName,
      identityHash: identity,
      riskInputs: {
        isInForm,
        formMethod,
        formAction,
        sectionText,
        inputType: type,
      },
      selectors: { css: cssPath(el), xpath: xpathFor() },
      locator: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      enabled: isEnabled(el),
      visible: isVisible(el),
      iframeKey: null,
    });
  }

  return results;
}

export function discoverRoutesFromDocument(
  currentUrl: string,
  depth: number,
  exclusions: readonly string[],
): DiscoveredRoute[] {
  let currentNormalized;
  try {
    currentNormalized = normalizeUrl(currentUrl);
  } catch {
    return [];
  }
  if (!currentNormalized.ok) return [];
  const currentKey = currentNormalized.url.key;

  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const seen = new Set<string>();
  const out: DiscoveredRoute[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href');
    if (!href) continue;
    let absolute: string;
    try {
      absolute = new URL(href, currentUrl).href;
    } catch {
      continue;
    }
    const normalized = normalizeUrl(absolute);
    if (!normalized.ok) continue;
    if (!sameOrigin(normalized.url.href, currentUrl)) continue;
    if (normalized.url.key === currentKey) continue;
    if (seen.has(normalized.url.key)) continue;
    const pathname = new URL(normalized.url.href).pathname;
    if (isDangerousRoute(pathname)) continue;
    if (isExcludedRoute(pathname, exclusions)) continue;
    seen.add(normalized.url.key);
    out.push({
      url: normalized.url.href,
      normalizedKey: normalized.url.key,
      kind: 'document',
      discoveredVia: 'anchor',
      depth: depth + 1,
    });
  }

  // data-href / data-url revealed links (menus, cards).
  for (const el of Array.from(document.querySelectorAll('[data-href], [data-url], [data-route]'))) {
    const raw =
      el.getAttribute('data-href') ?? el.getAttribute('data-url') ?? el.getAttribute('data-route');
    if (!raw) continue;
    let absolute: string;
    try {
      absolute = new URL(raw, currentUrl).href;
    } catch {
      continue;
    }
    const normalized = normalizeUrl(absolute);
    if (!normalized.ok || !sameOrigin(normalized.url.href, currentUrl)) continue;
    if (normalized.url.key === currentKey || seen.has(normalized.url.key)) continue;
    const pathname = new URL(normalized.url.href).pathname;
    if (isDangerousRoute(pathname) || isExcludedRoute(pathname, exclusions)) continue;
    seen.add(normalized.url.key);
    out.push({
      url: normalized.url.href,
      normalizedKey: normalized.url.key,
      kind: 'document',
      discoveredVia: 'data-attribute',
      depth: depth + 1,
    });
  }

  return out;
}
