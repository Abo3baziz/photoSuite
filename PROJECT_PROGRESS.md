# Implementation Plan & Progress

> This file doubles as `docsIMPLEMENTATION_PLAN.md` and `PROJECT_PROGRESS.md`. Updated after each milestone. Evidence = actually executed commands.

## Decisions baseline

From user decisions (2026-10-31): active-tab auditing; high-risk skip+queue; scroll-and-stitch full-page capture with suppression; `activeTab` + optional per-origin host permissions; product name `web-ui-auditor`. See `docs/TECHNICAL_DECISIONS.md` for detail.

---

## Milestone 0 — Repository analysis & design

Status: **done** (2026-10-31, commit `89c3653`)

- [x] Repository inspected (empty except `PROMPT.md`)
- [x] Key ambiguous decisions resolved with user
- [x] `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/DATA_MODEL.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/TESTING.md`
- [x] `AGENTS.md`
- [x] tech decisions doc with trade-off records (D1–D9)

## Latest test results

2026-10-31 (M1): typecheck clean · lint clean · Vitest 27/27 passed (4 files) · build OK · Playwright E2E 1/1 passed (extension install + panel + background connection).

## Milestone 1 — Extension foundation

Status: **done** (2026-10-31, commit `0b81ab5` + E2E follow-up)

Scope delivered
- MV3 manifest (least privilege; `optional_host_permissions` for per-origin grants), module service worker
- Vite build split: panel (hashed assets), background (fixed `background.js`, `codeSplitting:false`), content (esbuild IIFE, minified)
- Strict TS foundation, ESLint 10 + Prettier, Vitest 5
- Typed + Zod-validated message protocol (`shared/messaging`), RPC envelope, background router with `INVALID_MESSAGE` rejection
- Tab inspector with typed `auditable / unsupported / inaccessible` verdicts and plain-language unsupported reasons
- Content-script injection (`chrome.scripting`) + ISOLATED-world `content:inspectPage` (real element/viewport counts)
- Panel: React 19 + Zustand + hand-rolled CSS (D9); Overview shows real tab facts, origin permission could be granted via `chrome.permissions.request` from panel gesture, Inspect shows real DOM counters; Settings persists exploration limits, capture toggles, exclusion lists via validated storage path
- No placeholder statistics; audit session features arrive with M2+

Executive decisions recorded: TS pinned to 6.0.3 (typescript-eslint incompatible with TS 7, D8); Zod 4 `prefault` defaults for nested settings.

Acceptance evidence (actually executed on this machine, 2026-10-31)
- `pnpm typecheck` — pass (clean)
- `pnpm lint` — pass (clean)
- `pnpm test` — 27 passed / 0 failed (4 files: URL rules, settings schemas, router validation, panel shell)
- `pnpm build` — pass (panel 320 KB, background 94 KB, content 446 KB minified)
- `pnpm e2e` — 1 passed / 0 failed: extension loads into Chromium (channel `chromium`, new-headless), service worker registers, panel renders, background connected, unsupported extension-page message shown
- E2E note: `chromium_headless_shell` binary does NOT support extensions; new-headless Chromium channel does (documented in docs/TESTING.md)

Acceptance criteria vs. spec §11 M1
- [x] Extension installs successfully (E2E)
- [x] Side panel opens (E2E, panel.html + action-click wiring)
- [x] Active tab can be identified (unit + store tests; real-site path exercised in M2 E2E with fixture)
- [x] Content script can inspect the current page (code executed via `panel:inspectPage`; real-site E2E in M2)
- [x] Messages work reliably (router unit tests + E2E connected state)
- [x] Unsupported pages produce understandable errors (unit tests + E2E)

## Milestone 2 — Discovery engine

Status: planned

## Milestone 3 — Screenshot & interaction engine

Status: planned

## Milestone 4 — State exploration & persistence

Status: planned

## Milestone 5 — Diagnostics

Status: planned

## Milestone 6 — Reporting & export

Status: planned

## Milestone 7 — Hardening & release

Status: planned

---

## Latest test results

(to be recorded; must come from executed runs)

## Known issues

(recorded as found)
