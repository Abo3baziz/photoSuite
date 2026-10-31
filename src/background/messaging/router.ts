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
import { inspectActiveTab } from '../pageInspector';
import { getActiveTabInfo } from '../tabs/tabInspector';

/**
 * Single message entry for the background service worker. Validates the
 * request envelope, dispatches to a typed handler, and serializes the result
 * or a {@link DomainError} into an {@link RpcResponse}.
 */

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
      throw new DomainError('INVALID_MESSAGE', 'The message sent to the background script was not a valid request.', parsed.error.issues);
    }
    return await handleValidated(parsed.data);
  } catch (error) {
    return { ok: false, error: toRpcError(error) };
  }
}
