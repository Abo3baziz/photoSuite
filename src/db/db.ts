import Dexie, { type Table } from 'dexie';
import type { AuditSession } from '../shared/domain/auditSession';
import type { Route } from '../shared/domain/route';
import type { ScreenState } from '../shared/domain/screenState';
import type { UIElement } from '../shared/domain/uiElement';
import type { Interaction } from '../shared/domain/interaction';
import type { Screenshot, ScreenshotBlob } from '../shared/domain/screenshot';
import type { StateTransition } from '../shared/domain/stateTransition';
import type { DiagnosticEvent } from '../shared/domain/diagnosticEvent';
import type { Finding } from '../shared/domain/finding';
import type { ReviewQueueItem } from '../shared/domain/reviewQueueItem';

/**
 * Dexie-backed local store. Schema version 1 (see migrations note below).
 * All tables are session-scoped via `sessionId` indexes; cascade delete is
 * implemented in `sessionCleanup.ts`.
 */
export class WebUiAuditorDb extends Dexie {
  auditSessions!: Table<AuditSession, string>;
  routes!: Table<Route, string>;
  screenStates!: Table<ScreenState, string>;
  uiElements!: Table<UIElement, string>;
  interactions!: Table<Interaction, string>;
  screenshots!: Table<Screenshot, string>;
  screenshotBlobs!: Table<ScreenshotBlob, string>;
  stateTransitions!: Table<StateTransition, string>;
  diagnosticEvents!: Table<DiagnosticEvent, string>;
  findings!: Table<Finding, string>;
  reviewQueue!: Table<ReviewQueueItem, string>;

  constructor() {
    super('web-ui-auditor');
    this.version(1).stores({
      auditSessions: 'id, createdAt',
      routes: 'id, [sessionId+url], [sessionId+status], sessionId, url',
      screenStates: 'id, [sessionId+fingerprint], [sessionId+routeId], sessionId, routeId',
      uiElements:
        'id, [sessionId+screenStateId], [sessionId+identityHash], sessionId, screenStateId',
      interactions:
        'id, [sessionId+status], [sessionId+screenStateId], sessionId, screenStateId, targetElementId',
      screenshots:
        'id, [sessionId+kind], [sessionId+interactionId], sessionId, interactionId, screenStateId',
      screenshotBlobs: 'id',
      stateTransitions:
        'id, [sessionId+fromStateId], [sessionId+toStateId], sessionId, fromStateId, toStateId',
      diagnosticEvents:
        'id, [sessionId+category], [sessionId+severity], sessionId, screenStateId, interactionId, routeId',
      findings: 'id, [sessionId+severity], [sessionId+category], sessionId',
      reviewQueue: 'id, [sessionId+status], sessionId',
    });
  }
}

let dbInstance: WebUiAuditorDb | null = null;

export function getDb(): WebUiAuditorDb {
  if (dbInstance === null) dbInstance = new WebUiAuditorDb();
  return dbInstance;
}

export function setDbForTests(db: WebUiAuditorDb | null): void {
  dbInstance = db;
}

export type { Table };
