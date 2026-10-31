import { chromium, expect, test, type Worker } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * Fixture-site E2E.
 *
 * Verifies, against a real local website served by `scripts/serve-fixture.mjs`:
 *  - background service worker initialization and extension id derivation
 *  - the panel reporting the auditable active tab with origin facts (FR-02)
 *  - the pre-grant guard: no Inspect control until host access is granted
 *  - settings persistence through the real background round trip
 *
 * Known limitation (documented in docs/TESTING.md): Chrome's native extension
 * permission prompt cannot be automated in headless Chromium, so the full
 * grant→inspect path is covered by integration tests with chrome stubs until
 * a reliable automation path exists.
 */

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const FIXTURE_URL = 'http://127.0.0.1:4173/';

async function loadExtension(): Promise<{
  context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });
  let extensionId: string | null = null;
  for (let attempt = 0; attempt < 50 && extensionId === null; attempt += 1) {
    const worker: Worker | undefined = context.serviceWorkers()[0];
    if (worker !== undefined) {
      extensionId = new URL(worker.url()).host;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (extensionId === null) {
    await context.close();
    throw new Error('background service worker did not register');
  }
  return { context, extensionId };
}

test('panel audits the active fixture tab and persists settings through the background', async () => {
  const { context, extensionId } = await loadExtension();
  try {
    // Active-tab flow: the fixture page must be the focused, active tab so the
    // background's tab inspector sees it (product decision D1).
    const fixturePage = await context.newPage();
    await fixturePage.goto(FIXTURE_URL);
    const panelPage = await context.newPage();
    await panelPage.goto(`chrome-extension://${extensionId}/panel.html`);
    await fixturePage.bringToFront();
    await panelPage.reload(); // re-run init with the fixture as the active tab

    // FR-02: auditable origin facts shown.
    await expect(panelPage.getByText('Connected to background')).toBeVisible();
    await expect(
      panelPage.locator('.facts__url', { hasText: FIXTURE_URL.replace(/\/$/, '') }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(panelPage.getByText('Auditor Fixture — Home')).toBeVisible();

    // Pre-grant guard: prompt affordance present, Inspect not yet available.
    await expect(panelPage.getByText('not granted')).toBeVisible();
    await expect(panelPage.getByRole('button', { name: /Grant access/ })).toBeVisible();
    await expect(panelPage.getByRole('button', { name: 'Inspect page' })).toHaveCount(0);

    // Real persistence round trip through the background (chrome.storage).
    await panelPage.getByRole('button', { name: 'Settings' }).click();
    const maxRoutesInput = panelPage
      .locator('label', { hasText: 'Maximum routes' })
      .locator('input');
    await expect(maxRoutesInput).toHaveValue('100');
    await maxRoutesInput.fill('50');
    await panelPage.getByRole('button', { name: 'Save settings' }).click();
    await expect(panelPage.getByText('Saved.')).toBeVisible();

    await panelPage.reload();
    await panelPage.getByRole('button', { name: 'Settings' }).click();
    await expect(
      panelPage.locator('label', { hasText: 'Maximum routes' }).locator('input'),
    ).toHaveValue('50');

    // Restore defaults so the test leaves a clean profile.
    await panelPage.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(panelPage.getByText('Reset to defaults.')).toBeVisible();
    await expect(
      panelPage.locator('label', { hasText: 'Maximum routes' }).locator('input'),
    ).toHaveValue('100');
  } finally {
    await context.close();
  }
});
