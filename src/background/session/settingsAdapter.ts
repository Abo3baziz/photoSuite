import type { Settings } from '../../shared/config/settings';
import type { AuditSession } from '../../shared/domain/auditSession';

export function settingsToLimits(settings: Settings): AuditSession['limits'] {
  return {
    maxRoutes: settings.exploration.maxRoutes,
    maxActions: settings.exploration.maxActions,
    maxVisitsPerState: settings.exploration.maxVisitsPerState,
    maxDepth: settings.exploration.maxDepth,
    actionTimeoutMs: settings.exploration.actionTimeoutMs,
    retryCount: settings.exploration.retryCount,
    sessionTimeoutMs: settings.exploration.sessionTimeoutMs,
  };
}
