import { describe, expect, it } from 'vitest';
import {
  classifyUnsupportedPage,
  isAuditableUrl,
  isExcludedRoute,
  isTrackingParam,
  normalizeUrl,
  originPermissionPattern,
  routeKey,
  sameOrigin,
} from './rules';

describe('normalizeUrl', () => {
  it('normalizes host casing, default ports, fragments, and trailing root slash', () => {
    const result = normalizeUrl('HTTPS://EXAMPLE.COM:443/index.html#top');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.url.href).toBe('https://example.com/index.html');
  });

  it('drops tracking parameters but keeps meaningful ones, sorted deterministically', () => {
    const result = normalizeUrl(
      'https://shop.example.com/search?b=2&fbclid=zzz&utm_source=x&a=1#g',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.url.href).toBe('https://shop.example.com/search?a=1&b=2');
  });

  it('preserves non-default ports', () => {
    const result = normalizeUrl('http://example.com:8080/p');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.url.href).toBe('http://example.com:8080/p');
  });

  it('rejects non-http schemes and malformed input', () => {
    expect(normalizeUrl('chrome://settings')).toEqual({ ok: false, reason: 'not-http' });
    expect(normalizeUrl('not a url')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('does not mutate the input URL string', () => {
    const input = 'https://example.com/path?b=2&a=1';
    normalizeUrl(input);
    expect(input).toBe('https://example.com/path?b=2&a=1');
  });
});

describe('routeKey / same-origin / auditable', () => {
  it('deduplicates equivalent routes via key', () => {
    expect(routeKey('http://example.com:80/a?x=1&y=2')).toBe(
      routeKey('HTTP://example.com/a?x=1&y=2'),
    );
    expect(routeKey('https://example.com/a#frag')).toBe(routeKey('https://example.com/a'));
    expect(routeKey('ftp://example.com/a')).toBeNull();
  });

  it('validates same-origin strictly including port', () => {
    expect(sameOrigin('https://example.com/a', 'https://example.com/b')).toBe(true);
    expect(sameOrigin('http://example.com/a', 'https://example.com/b')).toBe(false);
    expect(sameOrigin('https://example.com:8080/a', 'https://example.com/b')).toBe(false);
  });

  it('auditable URL === normalized http(s) URL', () => {
    expect(isAuditableUrl('https://example.com')).toBe(true);
    expect(isAuditableUrl('chrome://extensions')).toBe(false);
    expect(isAuditableUrl('')).toBe(false);
  });
});

describe('classification of unsupported surfaces', () => {
  it('explains browser-internal pages', () => {
    const result = classifyUnsupportedPage('chrome://settings/');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('browser-internal');
    expect(result?.reason).toContain('http(s)');
  });

  it('explains extension and devtools surfaces', () => {
    expect(classifyUnsupportedPage('chrome-extension://abc/panel.html')?.kind).toBe(
      'chrome-extension',
    );
    expect(classifyUnsupportedPage('devtools://devtools/bundled/inspector.html')?.kind).toBe(
      'devtools',
    );
  });

  it('returns null for auditable web origins', () => {
    expect(classifyUnsupportedPage('https://example.com/page')).toBeNull();
  });

  it('surfaces the empty case', () => {
    expect(classifyUnsupportedPage('')?.kind).toBe('empty');
  });
});

describe('permission patterns & exclusions', () => {
  it('builds per-origin permission patterns', () => {
    expect(originPermissionPattern('https://shop.example.com/home')).toBe(
      'https://shop.example.com/*',
    );
    expect(originPermissionPattern('chrome://settings')).toBeNull();
  });

  it('matches route exclusions as normalized path prefixes', () => {
    expect(isExcludedRoute('/admin/users', ['/admin'])).toBe(true);
    expect(isExcludedRoute('/products', ['/admin', '/account'])).toBe(false);
    expect(isExcludedRoute('/products', [])).toBe(false);
  });

  it('detects tracking params', () => {
    expect(isTrackingParam('gclid')).toBe(true);
    expect(isTrackingParam('UTM_CAMPAIGN')).toBe(true);
    expect(isTrackingParam('q')).toBe(false);
  });
});
