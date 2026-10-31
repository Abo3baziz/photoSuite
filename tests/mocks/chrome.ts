/**
 * Minimal chrome.* mock for tests. Deliberately small: the real API is
 * exercised in E2E (docs/TESTING.md); these stubs only provide the surface the
 * unit-under-test actually touches. The single unavoidable cast is documented
 * below (test double, not production code).
 */

export interface ChromeMockRouting {
  /** message type → payload returned by chrome.runtime.sendMessage */
  readonly responses: Readonly<Record<string, unknown>>;
}

export interface ChromeMock {
  readonly sentMessages: unknown[];
  dispose(): void;
}

interface StorageLocalStub {
  readonly local: {
    readonly data: Map<string, unknown>;
    get(keys: string | string[] | object): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
  };
}

export function installChromeMock(routing: ChromeMockRouting): ChromeMock {
  const sentMessages: unknown[] = [];

  const storage: StorageLocalStub = {
    local: {
      data: new Map<string, unknown>(),
      get(keys) {
        const names = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : [];
        const out: Record<string, unknown> = {};
        for (const k of names) if (storage.local.data.has(k)) out[k] = storage.local.data.get(k);
        return Promise.resolve(out);
      },
      set(items) {
        for (const [k, v] of Object.entries(items)) storage.local.data.set(k, v);
        return Promise.resolve();
      },
    },
  };

  const chromeStub = {
    runtime: {
      id: 'test-extension-id',
      sendMessage: (message: unknown): Promise<unknown> => {
        sentMessages.push(message);
        const type = (message as { type?: unknown }).type;
        if (typeof type !== 'string') {
          return Promise.resolve({ ok: false, error: { code: 'MOCK', message: 'invalid message' } });
        }
        const response = routing.responses[type];
        if (response === undefined) {
          return Promise.resolve({ ok: false, error: { code: 'MOCK_NO_ROUTE', message: `no route for ${type}` } });
        }
        return Promise.resolve(response);
      },
      onMessage: { addListener: (): void => undefined },
    },
    storage,
    permissions: {
      contains: async (): Promise<boolean> => false,
      request: async (): Promise<boolean> => true,
    },
    sidePanel: { setPanelBehavior: async (): Promise<void> => undefined },
    tabs: { query: async (): Promise<never[]> => [] },
    scripting: { executeScript: async (): Promise<never[]> => [] },
  };

  // Test double: chrome.* globals are structurally richer than this stub; the
  // mock only guarantees the subset used by the code under test.
  const target = globalThis as unknown as { chrome?: unknown };
  target.chrome = chromeStub;

  return {
    sentMessages,
    dispose(): void {
      target.chrome = undefined;
    },
  };
}
