import { z } from 'zod';
import type {
  ActiveTabInfo,
  ContentRequest,
  InspectSummary,
} from '../../shared/messaging/protocol';
import {
  ActiveTabInfoSchema,
  ContentInspectPageRequestSchema,
  InspectSummarySchema,
} from '../../shared/messaging/protocol';
import type { AuditSession } from '../../shared/domain/auditSession';
import { AuditSessionSchema } from '../../shared/domain/auditSession';
import type { Route } from '../../shared/domain/route';
import { RouteSchema } from '../../shared/domain/route';
import type { Interaction } from '../../shared/domain/interaction';
import { InteractionSchema } from '../../shared/domain/interaction';
import type { UIElement } from '../../shared/domain/uiElement';
import { UIElementSchema } from '../../shared/domain/uiElement';
import { SettingsSchema } from '../../shared/config/settings';
import type { Settings } from '../../shared/config/settings';
import { parseRpcEnvelope, rpcError, type RpcResponse } from '../../shared/messaging/rpc';

/**
 * Panel-side client. The panel never imports background modules (AGENTS.md 4):
 * every exchange goes through `chrome.runtime.sendMessage` with envelope +
 * payload validation, and user-gesture-bound permission prompts are issued
 * from this context directly.
 */

export async function callBackground(message: unknown): Promise<RpcResponse<unknown>> {
  try {
    const raw: unknown = await chrome.runtime.sendMessage(message);
    return parseRpcEnvelope(raw);
  } catch (error) {
    return rpcError(
      'BACKGROUND_UNREACHABLE',
      error instanceof Error ? error.message : 'The background service worker did not respond.',
    );
  }
}

export async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  const response = await callBackground({ type: 'panel:getActiveTabInfo' });
  if (!response.ok) return null;
  const parsed = ActiveTabInfoSchema.safeParse(response.data);
  return parsed.success ? parsed.data : null;
}

export async function inspectPage(): Promise<RpcResponse<InspectSummary>> {
  const response = await callBackground({ type: 'panel:inspectPage' });
  if (!response.ok) return response;
  const parsed = InspectSummarySchema.safeParse(response.data);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : rpcError('INVALID_RESPONSE', 'Inspection result failed validation.');
}

export async function getSettings(): Promise<Settings | null> {
  const response = await callBackground({ type: 'panel:getSettings' });
  if (!response.ok) return null;
  const parsed = SettingsSchema.safeParse(response.data);
  return parsed.success ? parsed.data : null;
}

export async function saveSettings(settings: Settings): Promise<RpcResponse<Settings>> {
  const response = await callBackground({ type: 'panel:setSettings', settings });
  if (!response.ok) return response;
  const parsed = SettingsSchema.safeParse(response.data);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : rpcError('INVALID_RESPONSE', 'Saved settings failed validation.');
}

export async function resetSettings(): Promise<Settings | null> {
  const response = await callBackground({ type: 'panel:resetSettings' });
  if (!response.ok) return null;
  const parsed = SettingsSchema.safeParse(response.data);
  return parsed.success ? parsed.data : null;
}

/** Build a validated content-script request (shared with tests). */
export function contentInspectRequest(): ContentRequest {
  return ContentInspectPageRequestSchema.parse({ type: 'content:inspectPage' });
}

export async function startAudit(tabId?: number): Promise<RpcResponse<{ sessionId: string }>> {
  const response = await callBackground({ type: 'panel:startAudit', tabId });
  if (!response.ok) return response;
  const data = response.data as { sessionId?: unknown };
  if (typeof data?.sessionId !== 'string')
    return rpcError('INVALID_RESPONSE', 'Audit start did not return a session id.');
  return { ok: true, data: { sessionId: data.sessionId } };
}

export async function stopAudit(sessionId: string): Promise<RpcResponse<{ stopped: boolean }>> {
  const response = await callBackground({ type: 'panel:stopAudit', sessionId });
  if (!response.ok) return response;
  return { ok: true, data: { stopped: true } };
}

export async function getSession(sessionId?: string): Promise<AuditSession | null> {
  const response = await callBackground({ type: 'panel:getSession', sessionId });
  if (!response.ok) return null;
  if (response.data === null) return null;
  const parsed = AuditSessionSchema.safeParse(response.data);
  return parsed.success ? parsed.data : null;
}

export async function listRoutes(sessionId: string): Promise<Route[]> {
  const response = await callBackground({ type: 'panel:listRoutes', sessionId });
  if (!response.ok) return [];
  const parsed = z.array(RouteSchema).safeParse(response.data);
  return parsed.success ? parsed.data : [];
}

export async function listElements(screenStateId: string): Promise<UIElement[]> {
  const response = await callBackground({ type: 'panel:listElements', screenStateId });
  if (!response.ok) return [];
  const parsed = z.array(UIElementSchema).safeParse(response.data);
  return parsed.success ? parsed.data : [];
}

export async function listInteractions(sessionId: string): Promise<Interaction[]> {
  const response = await callBackground({ type: 'panel:listInteractions', sessionId });
  if (!response.ok) return [];
  const parsed = z.array(InteractionSchema).safeParse(response.data);
  return parsed.success ? parsed.data : [];
}
