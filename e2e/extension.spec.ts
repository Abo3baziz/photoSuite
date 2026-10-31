import { chromium, expect, test, type Worker } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * Milestone 1 E2E: the built extension (dist/) loads into Chromium, the
 * background service worker starts, and the side-panel page renders with a
 * working connection to the background.
 *
 * Note: the panel page itself counts as the "active tab" in this context, so
 * the Overview must show the clear unsupported-page message for extension
 * pages (FR-01) rather than auditable website facts.
 */

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

test('extension installs, background starts, and the panel renders', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });
  try {
    // Wait for the MV3 service worker and derive the extension id from it.
    let extensionId: string | null = null;
    for (let attempt = 0; attempt < 50 && extensionId === null; attempt += 1) {
      const worker: Worker | undefined = context.serviceWorkers()[0];
      if (worker !== undefined) {
        extensionId = new URL(worker.url()).host;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(extensionId, 'background service worker should register').not.toBeNull();

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/panel.html`);

    await expect(page.getByRole('heading', { name: 'Web UI Auditor' })).toBeVisible();
    await expect(page.getByText('Connected to background')).toBeVisible({ timeout: 15_000 });

    // The active "tab" is the panel itself (an extension page): FR-01 wants a
    // clear, understandable unsupported-page message.
    await expect(page.getByText(/This is an extension page/)).toBeVisible({ timeout: 15_000 });
  } finally {
    await context.close();
  }
});
