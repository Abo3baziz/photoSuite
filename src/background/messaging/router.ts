import type { PanelRequest } from '../../shared/messaging/protocol';
import { PanelRequestSchema } from '../../shared/messaging/protocol';
import {
  DomainError,
  rpcError,
  rpcOk,
  type RpcError,
  type RpcResponse,
} from '../../shared/messaging/rpc';
import { loadSettings, resetSettings, saveSettings } from '../settings/settingsStore';
import { runExploration } from '../exploration/explorationEngine';
import { getActiveTab, getActiveTabInfo } from '../tabs/tabInspector';
import {
  createSession,
  getSession,
  listSessions,
  terminateSession,
  getSessionRoutes,
} from '../session/sessionManager';
import { inspectActiveTab } from '../pageInspector';
import { uiElementRepository } from '../../db/repositories/uiElementRepository';
import { auditSessionRepository } from '../../db/repositories/auditSessionRepository';

/**
 * Single message entry for the background service worker. Validates the
 * request envelope, dispatches to a typed handler, and serializes the result
 * or a {@link DomainError} into an {@link RpcResponse}.
 */

const runningSessions = new Map<string, AbortController>();

async function handleValidated(request: PanelRequest): Promise<RpcResponse<unknown>> {
  switch (request.type) {
    case 'panel:ping':
      return rpcOk('pong');
    case 'panel:getActiveTabInfo':
      return rpcOk(await getActiveTabInfo());
    case 'panel:inspectPage':
      return inspectActiveTab();
    case 'panel:getSettings':
      return rpcOk(await loadSettings());
    case 'panel:setSettings':
      return rpcOk(await saveSettings(request.settings));
    case 'panel:resetSettings':
      return rpcOk(await resetSettings());
    case 'panel:startAudit': {
      const settings = await loadSettings();
      const tab = request.tabId ? { id: request.tabId } : await getActiveTab();
      const tabId = tab?.id;
      if (!tabId) throw new DomainError('NO_ACTIVE_TAB', 'No active tab to audit.');
      const info = await getActiveTabInfo();
      if (info.kind !== 'auditable') {
        throw new DomainError('UNSUPPORTED_PAGE', info.reason, {
          url: info.kind === 'unsupported' ? info.url : null,
        });
      }
      const session = await createSession({
        tabId,
        origin: info.origin,
        startUrl: info.url,
        settings,
      });
      const controller = new AbortController();
      runningSessions.set(session.id, controller);
      // Fire and forget; progress is persisted to IndexedDB and polled by panel.
      void runExploration(
        session,
        tabId,
        () => {
          /* progress persisted via repositories inside runExploration */
        },
        controller.signal,
      )
        .then(() => {
          runningSessions.delete(session.id);
        })
        .catch((error) => {
          runningSessions.delete(session.id);
          void auditSessionRepository.updateStatus(
            session.id,
            'failed',
            error instanceof Error ? error.message : String(error),
          );
        });
      return rpcOk({ sessionId: session.id });
    }
    case 'panel:stopAudit': {
      const controller = runningSessions.get(request.sessionId);
      if (controller) controller.abort();
      await terminateSession(request.sessionId, 'stopped by user');
      runningSessions.delete(request.sessionId);
      return rpcOk({ stopped: true });
    }
    case 'panel:getSession': {
      if (request.sessionId) {
        const session = await getSession(request.sessionId);
        if (!session) throw new DomainError('NOT_FOUND', 'Session not found.');
        return rpcOk(session);
      }
      const sessions = await listSessions();
      return rpcOk(sessions[0] ?? null);
    }
    case 'panel:listRoutes': {
      const routes = await getSessionRoutes(request.sessionId);
      return rpcOk(routes);
    }
    case 'panel:listElements': {
      const elements = await uiElementRepository.listByState(request.screenStateId);
      return rpcOk(elements);
    }
  }
}

function toRpcError(error: unknown): RpcError {
  if (error instanceof DomainError) {
    return rpcError(error.code, error.message, error.details).error;
  }
  return rpcError('INTERNAL_ERROR', error instanceof Error ? error.message : String(error)).error;
}

export async function handleMessageFromPanel(message: unknown): Promise<RpcResponse<unknown>> {
  try {
    const parsed = PanelRequestSchema.safeParse(message);
    if (!parsed.success) {
      throw new DomainError(
        'INVALID_MESSAGE',
        'The message sent to the background script was not a valid request.',
        parsed.error.issues,
      );
    }
    return await handleValidated(parsed.data);
  } catch (error) {
    return { ok: false, error: toRpcError(error) };
  }
}
