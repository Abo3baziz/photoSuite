// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import { WebUiAuditorDb, setDbForTests } from '../db';
import { routeRepository } from './routeRepository';
import { auditSessionRepository } from './auditSessionRepository';

describe('routeRepository', () => {
  let sessionId: string;

  beforeEach(async () => {
    setDbForTests(new WebUiAuditorDb());
    const session = await auditSessionRepository.create({
      origin: 'https://example.com',
      startUrl: 'https://example.com/',
      status: 'running',
      statusReason: null,
      limits: {
        maxRoutes: 10,
        maxActions: 10,
        maxVisitsPerState: 1,
        maxDepth: 2,
        actionTimeoutMs: 1000,
        retryCount: 0,
        sessionTimeoutMs: 60000,
      },
    });
    sessionId = session.id;
  });

  it('deduplicates routes by (sessionId, url)', async () => {
    const first = await routeRepository.upsert(sessionId, {
      sessionId,
      url: 'https://example.com/about',
      normalizedKey: 'https://example.com/about',
      kind: 'document',
      status: 'pending',
      depth: 1,
      discoveredVia: 'anchor',
    });
    const second = await routeRepository.upsert(sessionId, {
      sessionId,
      url: 'https://example.com/about',
      normalizedKey: 'https://example.com/about',
      kind: 'document',
      status: 'visited',
      depth: 1,
      discoveredVia: 'anchor',
    });
    expect(second.id).toBe(first.id);
    const all = await routeRepository.listBySession(sessionId);
    expect(all.filter((r) => r.url === 'https://example.com/about')).toHaveLength(1);
    expect(all.find((r) => r.url === 'https://example.com/about')?.status).toBe('visited');
  });

  it('finds by url and updates status', async () => {
    await routeRepository.upsert(sessionId, {
      sessionId,
      url: 'https://example.com/x',
      normalizedKey: 'https://example.com/x',
      kind: 'document',
      status: 'pending',
      depth: 1,
      discoveredVia: 'anchor',
    });
    const found = await routeRepository.findByUrl(sessionId, 'https://example.com/x');
    expect(found).toBeDefined();
    if (found) await routeRepository.updateStatus(found.id, 'visited');
    const updated = await routeRepository.findByUrl(sessionId, 'https://example.com/x');
    expect(updated?.status).toBe('visited');
    expect(updated?.lastVisitedAt).not.toBeNull();
  });
});
