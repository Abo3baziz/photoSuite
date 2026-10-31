# Technical Decisions — web-ui-auditor

> docs/TECHNICAL_DECISIONS.md (spec: `docsTECHNICAL_DECISIONS.md`). Each entry: context → decision → alternatives → consequences.

## D1 — Audit runs in the active tab

- **Context**: screenshots via `chrome.tabs.captureVisibleTab` require the audited tab to be the active tab of a focused window; audits drive navigation/interaction.
- **Decision**: audit the user's active tab (matches spec workflow).
- **Alternatives**: dedicated tab (user's original tab untouched but window focus must be stolen anyway for capture → same disruption, more state), dedicated window (side panel affinity issues, more chrome.windows orchestration).
- **Consequence**: clear in-UI consent ("this tab will be interacted with") + prominent Stop; orchestrator focuses the audited tab only when capturing.

## D2 — Service-worker resumability via persisted intents, not keepalives

- **MV3 SW reality**: the service worker is terminated after ~30s idle; long-running event handlers get at most a ~5-minute lifetime per event. Long audit loops cannot rely on process continuity; `chrome.alarms` minimum period (~30s) and WebSocket/keepalive tricks are unreliable.
- **Decision**: the audit loop is a **re-entrant state machine persisted in IndexedDB**. Before executing any step we write an `Interaction` row in `pending` (and set session `running`). Results are applied **idempotently** keyed by intent ID. Wake sources: panel heartbeats, content-script messages, `chrome.alarms` heartbeat. On wake, reconcile: if an intent is `pending` but no result exists within timeout, mark `interrupted` and re-dispatch — content-script action executors are written to be *safe to retry* (idempotent checks before act).
- **Alternatives**: `chrome.Offscreen` ping loops; long-lived `setInterval` keepalive (fragile, against platform guidance); the `debugger` permission (explicitly forbidden by spec §5F).
- **Consequence**: no false "completed" stats, duplicate executions prevented, recovery path testable. Added cost: every step persists before/after — bounded writes per action (~2-3 keys).

## D3 — MV3 build strategy: fixed filename bundles, no plugin magic

- **Context**: @crxjs plugin is beta-grade; MV3 requires hash-free static file references in `manifest.json`.
- **Decision**: Vite **library/entry** build with explicit `rollupOptions.input` for `background`, `content`, `content-main`, side panel HTML, and a single copy of `manifest.json` from `public/`. All referenced files have **exact names** (no content-hash) to satisfy MV3's static manifest references.
- **Alternatives**: crxjs (HMR ergonomics, but beta + moving API), Webpack (slower, heavier).
- **Consequence**: hand-rolled but small config; no HMR in panel (documented; dev loop uses `vite build --watch` + extension reload).

## D4 — MAIN-world instrumentation is opt-in, thin, and session-scoped

- **Context**: `console.error`, `window.onerror`, `unhandledrejection` are only observable from the MAIN world; but MAIN scripts share the page's JS (risk of collision, and page code could detect/tamper).
- **Decision**: a tiny shim (< ~100 lines, sources verified) injected **only during observation windows** of an active session, relaying via `window.postMessage` → ISOLATED-world relay → SW. Not injected when idle; no APIs beyond these hooks.
- **Alternatives**: `chrome.debugger` console API (forbidden for MVP); `chrome.webRequest` only (network-only; can't see console).
- **Consequence**: catching page-level errors is best-effort and window-bounded; documented limitation, not overpromised in UI copy.

## D5 — Risk classification is structural, label-light

- **Context**: FR-06 forbids treating labels alone as safety.
- **Decision**: `classifyRisk(element, session context)` returns `low | medium | high | critical` from *priors*: form submission context, URL mutation verbs (delete/remove/cancel patterns in `action`/`formaction`/nearest form `method`), confirmation dialogs, external origins, file inputs, hidden-field mutations, ARIA attributes (`aria-haspopup`, `role=payment` signals), and pricing keywords in **the form/section context** rather than the control's label alone. `critical` = passwords/payment/account-deletion/checkout contexts → never auto-executed; `high` = skipped & queued (user decision #2). Rules are data-driven tables in `src/shared/safety/rules.ts` and unit-tested.
- **Alternatives**: pure whitelist by element type (too coarse); ML hints (out of scope).
- **Consequence**: safe behaviors like "open modal", "change tab" still automate; destructive flows require human — even in the review queue, execution is a separate explicit user gesture.

## D6 — State fingerprinting covers DOM + inventory + overlay + a11y, not pixels

- **Context**: FR-08 requires URL + DOM + inventory + overlay + a11y; also screenshot-hash-only identity breaks under animation/ads timing.
- **Decision**: canonical JSON → sha256 (WebCrypto) of a normalized snapshot; near-duplicate screenshots (identical sha256 of PNG bytes) are deduped at the storage layer instead of influencing state identity.
- **Alternatives**: pixel hashing (unstable); text-only hashing (misses overlays).
- **Consequence**: deterministic, testable via unit fixtures; snapshot cost bounded by sampling DOM to interactive-relevant skeleton.

## D7 — Screenshots kept as bytes in a parallel Dexie table; composited via OffscreenCanvas in SW

- **Decision**: viewport PNGs are stored in `screenshotBlobs` keyed 1:1 by `Screenshot.id`; stitching runs in SW `OffscreenCanvas` (blob→`createImageBitmap`→composite→`convertToBlob`). Sticky/fixed suppression is injected via content script before scrolling, then restored; seam metadata recorded (`seamCount`, `suppressRuleApplied`).
- **Consequence**: query-time metadata stays small; export streams blobs efficiently.

## D8 — Package/tooling versions (2026-10-31)

- Vite 7.x, TypeScript ~5.9, React 19, Tailwind 4 (via `@tailwindcss/vite`), Zustand 5, Dexie 4, Zod 4, Vitest 3 (+ jsdom, `@testing-library/react`), Playwright 1.5x (Chromium channel), JSZip 3, ESLint 9 flat config. Chrome-for-Testing for E2E. Locked to current stable minors at scaffolding; exact pins recorded in `package.json`.
