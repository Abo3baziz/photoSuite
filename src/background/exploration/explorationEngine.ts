import {
  routeRepository,
  screenStateRepository,
  uiElementRepository,
} from '../session/sessionManager';
import { navigateTab, injectContentScript } from '../navigation/navManager';
import type { AuditSession } from '../../shared/domain/auditSession';
import { classifyRisk } from '../../shared/safety/risk';
import { normalizeUrl } from '../../shared/url/rules';
import { identityHash } from '../../shared/fingerprint/identity';
import { auditSessionRepository } from '../../db/repositories/auditSessionRepository';

export interface ExplorationProgress {
  readonly sessionId: string;
  readonly routesDiscovered: number;
  readonly routesVisited: number;
  readonly elementsDiscovered: number;
  readonly currentUrl: string | null;
}

export type ProgressCallback = (progress: ExplorationProgress) => void;

interface DiscoveredRoutePayload {
  readonly url: string;
  readonly normalizedKey: string;
  readonly kind: 'document' | 'spa';
  readonly discoveredVia: string;
  readonly depth: number;
}

interface DiscoveredElementPayload {
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

async function sendContentMessage<T>(tabId: number, message: unknown): Promise<T | null> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, message)) as
      { ok?: boolean; data?: T } | undefined;
    if (response && response.ok === true) return (response.data as T) ?? null;
    // Some handlers return the envelope differently; try direct.
    if (response && 'routes' in (response as Record<string, unknown>))
      return response as unknown as T;
    if (response && 'elements' in (response as Record<string, unknown>))
      return response as unknown as T;
    return null;
  } catch {
    return null;
  }
}

export async function runExploration(
  session: AuditSession,
  tabId: number,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  const limits = session.limits;
  const visitedKeys = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [];
  const startNormalized = normalizeUrl(session.startUrl);
  if (startNormalized.ok) {
    visitedKeys.add(startNormalized.url.key);
    queue.push({ url: session.startUrl, depth: 0 });
    await routeRepository.upsert(session.id, {
      sessionId: session.id,
      url: session.startUrl,
      normalizedKey: startNormalized.url.key,
      kind: 'document',
      status: 'pending',
      depth: 0,
      discoveredVia: 'start',
    });
  }

  let routesVisited = 0;
  let elementsDiscovered = 0;
  let routesDiscovered = 1;

  const deadline = Date.now() + limits.sessionTimeoutMs;

  while (queue.length > 0 && routesVisited < limits.maxRoutes && Date.now() < deadline) {
    if (signal?.aborted) {
      await auditSessionRepository.updateStatus(session.id, 'interrupted', 'stopped by user');
      return;
    }
    const next = queue.shift();
    if (!next) break;
    if (next.depth > limits.maxDepth) continue;

    const normalized = normalizeUrl(next.url);
    if (!normalized.ok) continue;
    if (visitedKeys.has(normalized.url.key) && routesVisited > 0) {
      // already visited; skip re-navigation
      const existing = await routeRepository.findByUrl(session.id, next.url);
      if (existing) await routeRepository.updateStatus(existing.id, 'visited');
      continue;
    }
    visitedKeys.add(normalized.url.key);

    // Navigate.
    const nav = await navigateTab(tabId, next.url);
    if (!nav.ok) {
      const existing = await routeRepository.findByUrl(session.id, next.url);
      if (existing) await routeRepository.updateStatus(existing.id, 'failed');
      continue;
    }

    await injectContentScript(tabId);

    // Wait for settle (simple fixed delay; M3 replaces with stability detection).
    await new Promise((resolve) => setTimeout(resolve, 400));

    const currentUrl = nav.url;
    routesVisited += 1;

    const existingRoute = await routeRepository.findByUrl(session.id, next.url);
    if (existingRoute) await routeRepository.updateStatus(existingRoute.id, 'visited');

    // Discover routes.
    const routeResult = await sendContentMessage<{ routes: DiscoveredRoutePayload[] }>(tabId, {
      type: 'content:discoverRoutes',
      depth: next.depth,
      exclusions: { routes: session.limits ? [] : [] },
    });
    const newRoutes = routeResult?.routes ?? [];
    for (const r of newRoutes) {
      if (routesDiscovered >= limits.maxRoutes) break;
      const rNorm = normalizeUrl(r.url);
      if (!rNorm.ok) continue;
      if (visitedKeys.has(rNorm.url.key)) continue;
      const existing = await routeRepository.findByUrl(session.id, r.url);
      if (existing) continue;
      await routeRepository.upsert(session.id, {
        sessionId: session.id,
        url: r.url,
        normalizedKey: r.normalizedKey,
        kind: r.kind,
        status: 'pending',
        depth: r.depth,
        discoveredVia: r.discoveredVia,
      });
      visitedKeys.add(rNorm.url.key);
      queue.push({ url: r.url, depth: r.depth });
      routesDiscovered += 1;
    }

    // Discover elements + persist screen state.
    const elementResult = await sendContentMessage<{
      elements: DiscoveredElementPayload[];
      viewport: { width: number; height: number; devicePixelRatio: number };
    }>(tabId, {
      type: 'content:discoverElements',
      shadowDepth: 3,
    });
    const elements = elementResult?.elements ?? [];
    const viewport = elementResult?.viewport ?? { width: 0, height: 0, devicePixelRatio: 1 };

    const fingerprint = await identityHash([
      currentUrl,
      String(elements.length),
      String(next.depth),
    ]);
    const state = await screenStateRepository.upsert(session.id, {
      sessionId: session.id,
      routeId:
        existingRoute?.id ?? (await routeRepository.findByUrl(session.id, next.url))?.id ?? '',
      url: currentUrl,
      fingerprint,
      isOverlayActive: false,
      viewport,
    });

    if (state.routeId) {
      const newElements = elements.map((el) => ({
        sessionId: session.id,
        screenStateId: state.id,
        role: el.role,
        tag: el.tag,
        accessibleName: el.accessibleName,
        identityHash: el.identityHash,
        riskClass: classifyRisk({
          tag: el.tag,
          role: el.role,
          type: el.riskInputs.inputType,
          accessibleName: el.accessibleName,
          isInForm: el.riskInputs.isInForm,
          formMethod: el.riskInputs.formMethod,
          formAction: el.riskInputs.formAction,
          hasConfirmDialog: false,
          isExternalOrigin: false,
          inputType: el.riskInputs.inputType,
          sectionText: el.riskInputs.sectionText,
          ariaHasPopup: null,
        }),
        selectors: el.selectors,
        locator: el.locator,
        enabled: el.enabled,
        visible: el.visible,
        iframeKey: el.iframeKey,
      }));
      await uiElementRepository.addMany(newElements);
      elementsDiscovered += newElements.length;
    }

    onProgress({
      sessionId: session.id,
      routesDiscovered,
      routesVisited,
      elementsDiscovered,
      currentUrl,
    });
  }

  await auditSessionRepository.updateStatus(session.id, 'completed', null);
}
