# Architecture — web-ui-auditor

> docs/ARCHITECTURE.md (spec: `docsARCHITECTURE.md`). Status: planned/design, kept current with implementation.

## 1. Context diagram

```
┌──────────────────────────── Chrome ─────────────────────────────┐
│                                                                  │
│  ┌── Side Panel (React, ISOLATED page) ──┐                       │
│  │  Overview · Pages · Interactions      │                       │
│  │  Findings · Review queue · Settings   │── runtime.sendMessage │
│  └──────────────────────┬────────────────┘                       │
│                         │ typed messages (Zod-validated)         │
│  ┌── Background service worker ────────────────────────────────┐ │
│  │  SessionOrchestrator · ExplorationEngine · NavManager       │ │
│  │  ScreenshotEngine · PermissionManager · MessageRouter       │ │
│  │  DiagnosticsCoordinator (aggregates) · Repositories → Dexie │ │
│  └───────┬──────────────────────────────┬─────────────────────┘ │
│          │ chrome.scripting / tabs       │ captureVisibleTab     │
│  ┌── Content scripts (per audited tab) ─┴────────────────────── ┐ │
│  │  ISOLATED world: discovery, interaction, observation         │ │
│  │  MAIN world (thin, opt-in): console + error instrumentation  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌── IndexedDB (Dexie) ─────────────────────────────────────────┐ │
│  │  sessions, routes, states, elements, interactions,           │ │
│  │  screenshots, transitions, diagnostics, findings, reviewQueue│ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Module map (one-time, then kept true)

| Module | Responsibility | Import policy |
|---|---|---|
| `src/shared/**` | Domain types + Zod schemas, URL rules, risk policy, fingerprinting, exploration config, message protocol, fs-agnostic utilities | imports nothing |
| `src/background/**` | Session lifecycle, orchestration, navigation, screenshots, permissions, diagnostics aggregation, recovery | imports `shared`, `db` |
| `src/content/**` | DOM discovery, interaction execution, observation (DOM/SPA/mutation), ISOLATED-world diagnostics | imports `shared` |
| `src/content-main/**` | Thin MAIN-world hooks: `console.error`, `window.onerror`, `unhandledrejection` relay | imports nothing but self |
| `src/panel/**` | React UI + Zustand store; no business logic | imports `shared`, `db` (read-only repos for export/local views) |
| `src/db/**` | Dexie schema + versioned migrations + repositories | imports `shared` |
| `src/report/**` | Self-contained offline report generation (HTML + embedded JSON) | imports `shared`, `db` (read) |
| `src/export/**` | ZIP assembly (JSZip): report, screenshots, JSON, manifest | imports `shared`, `db`, `report` |
| `src/fixture-site/**` | Static test app for E2E (multi-route, SPA, forms, modals, errors, lazies, destructive controls) | nothing |
| `e2e/**` | Playwright with unpacked extension | nothing |

Circular dependencies are forbidden. The MVP relies on review discipline (the `import/no-cycle` ESLint plugin is not currently installed; revisit when the dependency graph grows in M2–M4).

## 3. Component responsibilities

### Background service worker
- **SessionOrchestrator**: owns the audit loop (discover → schedule → act → capture → persist). It is *re-entrant*: the loop state machine is persisted before each step (`intent` record) and reconciled after (idempotent apply). If the worker suspends mid-step, the next wake (message, alarm, or panel action) resumes or safely terminates per `docs/TECHNICAL_DECISIONS.md` (D2).
- **NavManager**: tab lifecycle (close, navigation, crash), `webNavigation.onCompleted` re-injection into eligible granted origins, SPA route observation forwarding.
- **ScreenshotEngine**: viewport capture (`captureVisibleTab`), full-page stitch coordination (scroll program sent to content script, images composited in SW via `OffscreenCanvas`), metadata.
- **PermissionManager**: per-origin optional grants, activeTab fallback, revocation handling.
- **MessageRouter**: single entry, Zod-validated, dispatches to handlers; commits no logic itself.

### Content scripts (ISOLATED world)
- **discovery**: element extraction (native semantics + ARIA roles + shadow DOM), accessible-name extraction, route discovery from anchors + SPA history observation, element identity derivation.
- **interaction**: typed action executors (click, type, select, toggle, focus, keyboard, scroll) with pre/post validation, stability waits.
- **observation**: `MutationObserver` scoped to interactive regions, stability detection, turned off between steps.
- **diagnostics (ISOLATED part)**: failed resource load events, fetch/XHR network failure recording, dialog/overlay state observation.

### Content MAIN world (`content-main`)
- Thin shim installed only for the duration of a session step-set: captures `console.error`-level entries, `window.onerror`, `unhandledrejection`; forwards via `window.postMessage` → ISOLATED relay → background. Removed or disabled when audit is idle. Documented limitations in `docs/TESTING.md` §5.

### Side panel (React)
- Pages: Overview, Pages (routes/states), Interactions, Findings, Review (high-risk queue), Settings.
- Store: Zustand slices fed from a single message subscription + repositories where direct reads are safe.
- Accessibility: semantic headings, focus management, keyboard operability, `aria-live` progress.

## 4. Communication flows (typed)

All messages: `Message<T extends string, P>` discriminated unions in `shared/messaging/protocol.ts`; validated by Zod at `MessageRouter` (SW), content-script listener, and panel client. Screenshot blobs are **never** in messages; messages reference IDs.

1. Panel → SW: session control (`start/stop/pause/resume`), queries (overview stats, lists), settings updates, review-queue decisions (approve = user explicitly executes later from Review page; MVP: skipped-and-queued only).
2. SW → Content: `discoverRoutes`, `discoverElements`, `executeAction`, `setObservation`, `stabilize`, `scrollForCapture`, `suppressFixedCapture`.
3. Content → SW: discovery results, action results (including failure/skipped reasons), state-change observations, relayed MAIN-world diagnostics.
4. SW → Panel: push events `audit:*` (progress, state, findings, diagnostics, awaiting-review).

## 5. Extension lifecycle & recovery

- **Install/update**: `onInstalled` initializes defaults (settings schema version), opens panel opt-in.
- **Session start**: validates URL/origin, requests per-origin permission if needed (user gesture from panel), creates `AuditSession` row, seeds route graph with current URL.
- **Run loop** (per step): persist `interaction.intent` → execute in content script with timeout envelope → persist result + screenshots + diagnostics → recompute fingerprint & coverage → persist → loop with `chrome.alarms` heartbeat.
- **Suspension**: intents make replay safe (see D2). **Tab closed / navigated**: session marked `interrupted`, resumable from Pages page. **Permission revoked mid-session**: capture/interaction steps become `skipped:permission`; session survives.
- **Tab focus requirement**: `captureVisibleTab` needs the audited tab active; the orchestrator activates the audited tab before capture (documented UX consequence: the audited tab is foregrounded during capture windows).

## 6. State management

- **Panel**: Zustand (`create` + subscribe), slices: `session`, `progress`, `pages`, `interactions`, `findings`, `reviewQueue`, `settings`. Slices updated from SW pushes and explicit queries. No server, no network.
- **Background**: no global mutable singleton state beyond a minimal per-session runtime registry; the authoritative state lives in IndexedDB.
- **Content**: per-document ephemeral registries with data-attribute-only side effects.

## 7. Data persistence

Dexie v1 schema in `src/db/schema.ts` with explicit version blocks; migrations append-only. Screenshot binaries live in `screenshots.blobs` (blob table keyed by `screenshotId`) separate from JSON metadata. Indexes are session-scoped where practical; see `docs/DATA_MODEL.md`.

## 8. Interface seams reserved for future AI (not implemented now)

- `FindingSource` tagged unions (`'rule' | 'diagnostic' | 'screenshot' | 'ai:preview'`) — AI findings must arrive through the same append path and can never be marked `verified` without human confirmation.
- `SuggestionPort` surface (empty for MVP) where a future planner could propose actions; all proposed actions **must** re-enter the Interaction Engine's safety pipeline. No bypass path exists by construction.
