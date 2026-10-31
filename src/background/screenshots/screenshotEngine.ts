import { screenshotRepository, screenshotBlobRepository } from '../../db/repositories/screenshotRepository';
import type { Screenshot } from '../../shared/domain/screenshot';

export interface ViewportInfo {
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
}

export interface CaptureResult {
  readonly screenshotId: string;
  readonly sha256: string;
}

async function sha256Blob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

async function captureVisibleViewport(_tabId: number): Promise<Blob> {
  const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
  const response = await fetch(dataUrl);
  return response.blob();
}

async function getViewportInfo(tabId: number): Promise<ViewportInfo | null> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, { type: 'content:getViewportInfo' })) as
      | { ok?: boolean; data?: ViewportInfo }
      | undefined;
    if (response && response.ok === true && response.data) return response.data;
    // direct
    if (response && 'scrollWidth' in (response as Record<string, unknown>)) return response as unknown as ViewportInfo;
    return null;
  } catch {
    return null;
  }
}

export async function captureViewport(
  sessionId: string,
  tabId: number,
  screenStateId: string | null,
  interactionId: string | null,
  kind: Screenshot['kind'],
): Promise<CaptureResult | null> {
  try {
    const blob = await captureVisibleViewport(tabId);
    const hash = await sha256Blob(blob);
    const tab = await chrome.tabs.get(tabId);
    const dpr = (await getViewportInfo(tabId))?.devicePixelRatio ?? 1;
    const screenshot = await screenshotRepository.create({
      sessionId,
      screenStateId,
      interactionId,
      kind,
      viewport: { width: tab.width ?? 0, height: tab.height ?? 0, devicePixelRatio: dpr },
      scroll: { x: 0, y: 0 },
      dpr,
      dimensions: { width: 0, height: 0 },
      sha256: hash,
    });
    await screenshotBlobRepository.put({ id: screenshot.id, data: blob, sha256: hash });
    // dimensions filled lazily by image decode; best-effort
    try {
      const bitmap = await createImageBitmap(blob);
      void bitmap;
    } catch {
      /* ignore */
    }
    return { screenshotId: screenshot.id, sha256: hash };
  } catch (error) {
    console.warn('[web-ui-auditor] viewport capture failed', error);
    return null;
  }
}

export async function captureFullPage(
  sessionId: string,
  tabId: number,
  screenStateId: string | null,
  interactionId: string | null,
): Promise<CaptureResult | null> {
  const info = await getViewportInfo(tabId);
  if (!info) return captureViewport(sessionId, tabId, screenStateId, interactionId, 'fallback');

  // Suppress fixed/sticky elements during capture.
  await chrome.tabs.sendMessage(tabId, { type: 'content:suppressFixed', enabled: true }).catch(() => undefined);

  const parts: { y: number; blob: Blob }[] = [];
  const step = info.viewportHeight;
  const positions: number[] = [];
  for (let y = 0; y < info.scrollHeight; y += step) {
    positions.push(Math.min(y, info.scrollHeight - info.viewportHeight));
  }
  // dedupe positions (last clamp may repeat)
  const uniquePositions = [...new Set(positions)];

  for (const y of uniquePositions) {
    await chrome.tabs.sendMessage(tabId, { type: 'content:scrollForCapture', x: 0, y }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const blob = await captureVisibleViewport(tabId);
    parts.push({ y, blob });
  }

  // Restore.
  await chrome.tabs.sendMessage(tabId, { type: 'content:suppressFixed', enabled: false }).catch(() => undefined);
  await chrome.tabs.sendMessage(tabId, { type: 'content:scrollForCapture', x: 0, y: 0 }).catch(() => undefined);

  // Stitch.
  try {
    const bitmaps = await Promise.all(parts.map(async (p) => ({ y: p.y, bitmap: await createImageBitmap(p.blob) })));
    const canvas = new OffscreenCanvas(info.scrollWidth * info.devicePixelRatio, info.scrollHeight * info.devicePixelRatio);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.scale(1, 1);
    for (const part of bitmaps) {
      const drawY = part.y * info.devicePixelRatio;
      ctx.drawImage(part.bitmap, 0, drawY);
      part.bitmap.close();
    }
    const stitched = await canvas.convertToBlob({ type: 'image/png' });
    const hash = await sha256Blob(stitched);
    const screenshot = await screenshotRepository.create({
      sessionId,
      screenStateId,
      interactionId,
      kind: 'stitched',
      viewport: { width: info.viewportWidth, height: info.viewportHeight, devicePixelRatio: info.devicePixelRatio },
      scroll: { x: 0, y: 0 },
      dpr: info.devicePixelRatio,
      dimensions: { width: info.scrollWidth, height: info.scrollHeight },
      sha256: hash,
    });
    await screenshotBlobRepository.put({ id: screenshot.id, data: stitched, sha256: hash });
    return { screenshotId: screenshot.id, sha256: hash };
  } catch (error) {
    console.warn('[web-ui-auditor] full-page stitch failed, falling back to viewport', error);
    return captureViewport(sessionId, tabId, screenStateId, interactionId, 'fallback');
  }
}
