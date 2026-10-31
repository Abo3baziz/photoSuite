// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installChromeMock, type ChromeMock } from '../mocks/chrome';

/**
 * Panel shell smoke test (Milestone 1): header renders, background exchanges
 * work through the typed client, and unsupported pages produce a clear,
 * plain-language message (FR-01).
 */

const UNSUPPORTED_REASON = 'This is a browser-internal page (chrome://…). Auditing only works on http(s) websites.';

const SETTINGS_OK = {
  version: 1,
  exploration: {
    maxRoutes: 100,
    maxActions: 500,
    maxVisitsPerState: 3,
    maxDepth: 10,
    actionTimeoutMs: 10_000,
    retryCount: 2,
    sessionTimeoutMs: 1_800_000,
  },
  capture: { fullPage: true },
  exclusions: { routes: [], elements: [] },
};

function installFor(tabInfo: unknown): ChromeMock {
  return installChromeMock({
    responses: {
      'panel:ping': { ok: true, data: 'pong' },
      'panel:getActiveTabInfo': { ok: true, data: tabInfo },
      'panel:getSettings': { ok: true, data: SETTINGS_OK },
    },
  });
}

afterEach(() => {
  vi.resetModules();
});

describe('<App />', () => {
  it('renders the shell and reports an unsupported page clearly', async () => {
    const mock = installFor({ kind: 'unsupported', url: 'chrome://settings/', reason: UNSUPPORTED_REASON });
    const { App } = await import('../../src/panel/App');
    render(React.createElement(App));

    expect(await screen.findByRole('heading', { name: 'Web UI Auditor' })).toBeInTheDocument();
    expect(await screen.findByText(UNSUPPORTED_REASON)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    mock.dispose();
  });

  it('shows a connected pill and grant action for an auditable page without host access', async () => {
    const mock = installFor({
      kind: 'auditable',
      url: 'https://example.com/intro',
      origin: 'https://example.com',
      title: 'Example',
      hasOriginPermission: false,
    });
    const { App } = await import('../../src/panel/App');
    render(React.createElement(App));

    await waitFor(() => expect(screen.getByText('Connected to background')).toBeInTheDocument());
    const originTexts = await screen.findAllByText('https://example.com');
    expect(originTexts.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Grant access/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect page' })).not.toBeInTheDocument();
    mock.dispose();
  });
});
