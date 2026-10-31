import { getDb } from '../../db/db';
import { auditSessionRepository } from '../../db/repositories/auditSessionRepository';
import { routeRepository } from '../../db/repositories/routeRepository';
import { screenStateRepository } from '../../db/repositories/screenStateRepository';
import { uiElementRepository } from '../../db/repositories/uiElementRepository';
import type { AuditSession } from '../../shared/domain/auditSession';
import type { Route } from '../../shared/domain/route';
import type { Settings } from '../../shared/config/settings';
import { settingsToLimits } from './settingsAdapter';

export { settingsToLimits };

export interface StartAuditInput {
  readonly sessionId?: string;
  readonly tabId: number;
  readonly origin: string;
  readonly startUrl: string;
  readonly settings: Settings;
}

export async function createSession(input: StartAuditInput): Promise<AuditSession> {
  const limits = settingsToLimits(input.settings);
  return auditSessionRepository.create({
    origin: input.origin,
    startUrl: input.startUrl,
    status: 'running',
    statusReason: null,
    limits,
  });
}

export async function getSession(id: string): Promise<AuditSession | undefined> {
  return auditSessionRepository.get(id);
}

export async function listSessions(): Promise<AuditSession[]> {
  return auditSessionRepository.list();
}

export async function terminateSession(id: string, reason: string): Promise<void> {
  await auditSessionRepository.updateStatus(id, 'interrupted', reason);
}

export async function completeSession(id: string): Promise<void> {
  await auditSessionRepository.updateStatus(id, 'completed', null);
}

export async function getSessionRoutes(sessionId: string): Promise<Route[]> {
  return routeRepository.listBySession(sessionId);
}

export async function getSessionElements(sessionId: string): Promise<number> {
  const states = await screenStateRepository.listBySession(sessionId);
  let count = 0;
  for (const state of states) {
    count += (await uiElementRepository.listByState(state.id)).length;
  }
  return count;
}

// Re-export repositories for engine use.
export { routeRepository, screenStateRepository, uiElementRepository };
void getDb;
