import { describe, expect, it } from 'vitest';
import { handleMessageFromPanel } from '../../src/background/messaging/router';
import { DomainError } from '../../src/shared/messaging/rpc';

/**
 * Router validation (Milestone 1): unknown/garbled messages are rejected with a
 * typed error envelope; clean requests dispatch without touching `chrome.*`
 * beyond the handler's own needs.
 * NOTE: handlers that need chrome APIs (tab inspection, settings) are covered
 * by integration tests with chrome stubs as those engines land (M2+).
 */

describe('background message router', () => {
  it('answers ping with pong over the result envelope', async () => {
    const response = await handleMessageFromPanel({ type: 'panel:ping' });
    expect(response).toEqual({ ok: true, data: 'pong' });
  });

  it('rejects malformed requests with INVALID_MESSAGE', async () => {
    for (const bad of [
      null,
      {},
      { type: 'bogus' },
      { type: 'panel:setSettings', settings: { version: 9 } },
    ]) {
      const response = await handleMessageFromPanel(bad);
      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.error.code).toBe('INVALID_MESSAGE');
      }
    }
  });

  it('serializes DomainErrors thrown by handlers into ok:false envelopes', async () => {
    // Reach the error path via a handler that uses chrome APIs without a stub:
    // getSettings → settingsStore.loadSettings touches chrome.storage.local.
    // Without a chrome stub the storage access rejects; the router must not throw.
    const response = await handleMessageFromPanel({ type: 'panel:getSettings' });
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.message).not.toBe('');
    }
  });

  it('keeps DomainError identity rules documented', () => {
    const error = new DomainError('TEST_CODE', 'boom', { a: 1 });
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ a: 1 });
  });
});
