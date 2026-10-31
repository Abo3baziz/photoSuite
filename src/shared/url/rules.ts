/**
 * URL normalization, same-origin validation, and route-key derivation.
 * Pure string logic — no `chrome.*` APIs (AGENTS.md rule 1).
 */

const TRACKING_PARAM_WHOLE = new Set([
  'gclid',
  'fbclid',
  'msclkid',
  'dclid',
  'yclid',
  'twclid',
  'igshid',
  'vero_id',
  'ttclid',
]);

const TRACKING_PARAM_PREFIXES = ['utm_', 'mc_', 'ref_', 'hsa_'];

export type UrlNormalizable = { href: string; origin: string; path: string; query: string; key: string };
export type UrlResult = { ok: true; url: UrlNormalizable } | { ok: false; reason: 'malformed' | 'not-http' };

/** Purge obvious tracking parameters; cases compared lowercased. */
export function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (TRACKING_PARAM_WHOLE.has(lower)) return true;
  return TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Normalize an absolute URL for storage as a route:
 * - lowercase scheme+host, strip default ports (80/443)
 * - remove the fragment
 * - remove tracking params, sort the remaining query params deterministically
 * - keep (meaningful) query parameters otherwise
 * - drop a trailing slash on root paths only ("/" stays "/")
 */
export function normalizeUrl(input: string): UrlResult {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'not-http' };
  }

  // URL makes href canonical except for ports it retains; drop default ports.
  if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) {
    parsed.port = '';
  }

  parsed.hash = '';

  const kept = [...parsed.searchParams.entries()]
    .map(([k, v]) => [k, v] as const)
    .filter(([k]) => !isTrackingParam(k))
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));

  const search = new URLSearchParams();
  for (const [k, v] of kept) search.append(k, v);

  // Canonical route key text; root path keeps "/" (no double trailing slash).
  const path = parsed.pathname || '/';
  const query = search.toString();
  const keyQuery = query === '' ? '' : `?${query}`;
  const href = `${parsed.origin}${path}${keyQuery}`;

  return { ok: true, url: { href, origin: parsed.origin, path, query, key: href } };
}

export function isAuditableUrl(url: string): boolean {
  const result = normalizeUrl(url);
  return result.ok;
}

/** A restricted browser surface (chrome://-style pages, devtools, …). */
export type UnsupportedPageKind =
  | 'browser-internal'
  | 'chrome-extension'
  | 'devtools'
  | 'view-source'
  | 'unknown'
  | 'empty';

/** True only for http(s) — auditors touch web origins only. */
export function isWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/** Deterministic key used for route deduplication (FR-03). */
export function routeKey(input: string): string | null {
  const result = normalizeUrl(input);
  return result.ok ? result.url.key : null;
}

/** `chrome.permissions` origin pattern; returns null for non-web origins. */
export function originPermissionPattern(input: string): string | null {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

/** Route exclusion prefixes are matched against the normalized path only. */
export function isExcludedRoute(pathInput: string, prefixes: readonly string[]): boolean {
  const path = new URL('https://unused.local' + (pathInput.startsWith('/') ? pathInput : `/${pathInput}`)).pathname;
  return prefixes.some((prefix) => prefix.length > 0 && path.startsWith(prefix));
}

/**
 * Human-readable classification of restricted URLs the auditor cannot touch.
 * Kept deliberately explicit rather than clever (unsupported-page errors must
 * be understandable — FR-01).
 */
export function classifyUnsupportedPage(url: string): { kind: UnsupportedPageKind; reason: string } | null {
  const trimmed = url.trim();
  if (trimmed === '') return { kind: 'empty', reason: 'Chrome did not expose a URL for this tab, so the auditor cannot inspect it.' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { kind: 'unknown', reason: `The URL "${trimmed}" is not a valid web address.` };
  }
  switch (parsed.protocol) {
    case 'chrome:':
    case 'edge:':
    case 'about:':
      return {
        kind: 'browser-internal',
        reason: `This is a browser-internal page (${parsed.protocol}//…). Auditing only works on http(s) websites.`,
      };
    case 'chrome-extension:':
      return { kind: 'chrome-extension', reason: 'This is an extension page. Auditing works on websites, not extension surfaces.' };
    case 'devtools:':
      return { kind: 'devtools', reason: 'This is a DevTools surface and cannot be audited.' };
    case 'view-source:':
      return { kind: 'view-source', reason: 'This is a view-source surface. Open the page itself to audit it.' };
    case 'file:':
      return {
        kind: 'browser-internal',
        reason: 'Local files cannot be audited unless “Allow access to file URLs” is enabled for this extension on chrome://extensions.',
      };
    default:
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { kind: 'unknown', reason: `Only http(s) websites can be audited — this tab uses ${parsed.protocol}//….` };
      }
      return null;
  }
}
