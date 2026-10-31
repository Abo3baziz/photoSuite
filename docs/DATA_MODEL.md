# Data Model — web-ui-auditor

> docs/DATA_MODEL.md (spec: `docsDATA_MODEL.md`). Entities are TypeScript types + Zod schemas in `src/shared/domain/`, persisted via Dexie in `src/db/`.

## Conventions

- **IDs** (`string`): prefixed ULID-ish (`utcMs + random`) via `newId(prefix)` — sortable, no clock dependency issues from `Date.now()` alone; session-scoped IDs aren't reused.
- **Timestamps**: `createdAt`, `updatedAt` (epoch ms). Events use `occurredAt`.
- **Session isolation**: every persisted row carries `sessionId`; queries and cleanup are session-scoped.
- **Schema**: Dexie v1 with `version(n).stores(...)` blocks; additive migrations only. Screenshot bytes in a dedicated blob table, never inline in metadata rows.

## Entities

| Entity | Key fields | Indexes (beyond PK) |
|---|---|---|
| `AuditSession` | id, origin, startUrl, status (`running/paused/interrupted/completed/failed`), startedAt, limits (exploration config snapshot), statusReason | `createdAt` |
| `Route` | id, sessionId, url (normalized), routeKind (`document/spa`), status (`pending/visited/blocked/excluded/failed`), depth, discoveredVia, firstSeenAt | `[sessionId+url]` unique, `[sessionId+status]` |
| `ScreenState` | id, sessionId, routeId, url, fingerprint (hex), isOverlayActive, viewport (`{w,h,dpr}`), discoveredAt | `[sessionId+fingerprint]` unique, `[sessionId+routeId]` |
| `UIElement` | id, sessionId, screenStateId, role, tag, accessibleName (nullable), identityHash, riskClass, selectors (`{css,xpath}`), locator (`{x,y,w,h}`), enabled, visible, iframeKey (nullable) | `[sessionId+screenStateId]`, `[sessionId+identityHash]` |
| `Interaction` | id, sessionId, targetElementId, screenStateId (before), actionType, params, status (`pending/running/succeeded/failed/skipped`), skipReason (nullable), durationMs (nullable), error (nullable), beforeScreenshotId, afterScreenshotId, uiStateIdAfter | `[sessionId+status]`, `[sessionId+screenStateId]` |
| `Screenshot` | id, sessionId, screenStateId (nullable), interactionId (nullable), kind (`initial/before/after/overlay/stitched/fallback`), viewport, scroll (`{x,y}`), dpr, dimensions, bytesStored (bytes live in blob table), sha256 | `[sessionId+kind]`, `[sessionId+interactionId]` |
| `ScreenshotBlob` (internal) | id (=`screenshotId`), data (`Blob`), sha256 | — |
| `StateTransition` | id, sessionId, fromStateId, toStateId, interactionId, observedAt | `[sessionId+fromStateId]`, `[sessionId+toStateId]` |
| `DiagnosticEvent` | id, sessionId, screenStateId (nullable), interactionId (nullable), routeId (nullable), severity (`info/warn/error`), category (`js-error/rejection/console-error/network-failed/http-error/navigation-failure/interaction-failure/observation`), message, detail (nullable), occurredAt | `[sessionId+category]`, `[sessionId+severity]` |
| `Finding` | id, sessionId, severity (`info/warning/error/critical`), category, title, description, evidence (`{ screenshots[], diagnostics[], interactions[] }`), protoRef reproductionsSteps, source (`rule/diagnostic` — the MVP never emits `ai:*`), verified (`false` until user-confirmed; automated findings never self-verify) | `[sessionId+severity]`, `[sessionId+category]` |
| `ReviewQueueItem` | id, sessionId, elementId (denormalized snapshot of element + action), status (`queued/approved/dismissed`), reason | `[sessionId+status]` |
| `SettingDoc` (chrome.storage, not Dexie) | exploration limits, exclusions, safety toggles, capture settings — Zod-validated | — |

## Relationships

```
AuditSession 1─* Route 1─* ScreenState 1─* UIElement
AuditSession 1─* Interaction; Interaction ─> ScreenState(before) ─> ScreenState(after via StateTransition)
Screenshot 0..1─1 Interaction | ScreenState; bytes 1:1 in ScreenshotBlob
DiagnosticEvent 0..1─ Route | ScreenState | Interaction
Finding ─* evidence refs (screenshots, diagnostics, interactions)
```

## Reference rules

- Foreign references are soft (indexed string IDs). Deleting a session is a transaction that drains every `sessionId`-indexed table (cascade helper in `db/sessionCleanup.ts`).
- `fingerprint` = sha256 over canonical JSON of `{ urlKey, domSkeleton, elementInventory, overlayState, a11ySummary }` — *not* screenshot hashes (FR-08).
- `identityHash` for elements = sha256 over `{ role, accessibleName, tag, frameKey, stableSelectors }` — never class-animated or generated class names alone.
