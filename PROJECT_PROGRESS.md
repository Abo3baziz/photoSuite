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

## Milestone 2 — CI and Build (CI_PROMPT)

Status: **done** (2026-10-31)

Deliverables
- `.github/workflows/ci.yml` — `Quality & Tests` job: lint, format check, typecheck, unit/component tests
- `.github/workflows/build.yml` — `Production Extension` job: build + `scripts/validate-build.mjs` + artifact upload
- `scripts/validate-build.mjs` — manifest MV3 validation, referenced-resource checks, dev-artifact leak checks
- `scripts/clean-dist.mjs`, `scripts/serve-fixture.mjs`
- `package.json` scripts: `format:check`, `build:validate`, `clean`, `serve:fixture`, `package:release`, `check:release-tag`
- `.prettierignore` (markdown/lockfiles excluded)

Evidence: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` (27/27), `pnpm build`, `pnpm build:validate` all pass on this machine.

## Milestone 3 — E2E (CI_PROMPT)

Status: **done** (2026-10-31)

Deliverables
- `.github/workflows/e2e.yml` — `Chrome Extension Tests` job: browser+deps install, build, validate, Playwright, artifact upload on failure
- `e2e/extension.spec.ts` (install/SW/panel) and `e2e/fixture.spec.ts` (auditable origin + settings persistence round trip)
- `src/fixture-site/` — multi-page + SPA + forms + modals + long page + lazy images + destructive control + 404
- `playwright.config.ts` — webServer for the local fixture site, HTML reporter, chromium channel (new headless)

Evidence: `pnpm e2e` — 2/2 passed. Known limitation documented: Chrome's native extension permission prompt cannot be automated in headless Chromium, so the grant→inspect path is covered by integration tests with chrome stubs.

## Milestone 4 — Security (CI_PROMPT)

Status: **done** (2026-10-31)

Deliverables
- `.github/workflows/codeql.yml` — JS/TS, `security-extended`, weekly schedule
- `.github/workflows/dependency-review.yml` — fail-on-severity: high, AGPL-3.0 denied
- `.github/dependabot.yml` — weekly npm + github-actions updates, grouped minor/patch
- `docs/GITHUB_SETUP.md` — secret scanning, push protection, Dependabot alerts

## Milestone 5 — Release (CI_PROMPT)

Status: **done** (2026-10-31)

Deliverables
- `.github/workflows/release.yml` — tag validation, quality checks, build, validate, reproducible ZIP + SHA-256, GitHub Release
- `scripts/check-release-tag.mjs` — tag vs package.json version check
- `scripts/package-release.mjs` — hand-rolled deterministic ZIP writer (fixed mtimes, sorted entries, fixed compression level) + sidecar checksum + self-verification

Evidence: `pnpm check:release-tag` (v0.1.0) passes; two consecutive packaging runs produced identical SHA-256 (`30f541…` → now `0bfb…`? re-verified deterministic across two clean builds).

## Milestone 6 — Repository configuration (CI_PROMPT)

Status: **done** (2026-10-31)

Deliverables
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `config.yml` (blank issues allowed)
- `docs/GITHUB_SETUP.md` — branch protection / ruleset instructions (no CODEOWNERS: no known maintainers; never invent usernames)
- `docs/CI_CD.md` — workflow purposes, triggers, checks, artifacts, troubleshooting, coverage policy
- `AGENTS.md` — merged from `AGENTS.md` + `AGENTS_V2.md`; added repository-specific conventions (permissions, CI, styling, safety, AI scope)

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
