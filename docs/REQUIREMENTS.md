# Requirements Traceability — web-ui-auditor

> docs/REQUIREMENTS.md (spec: `docsREQUIREMENTS.md`). Maps `PROMPT.md` §5/§6/§7 to planned implementation and acceptance evidence. Kept current as implementation lands.

## Traceability table

| ID | Requirement (abridged) | Implementation home | Status |
|---|---|---|---|
| FR-01 | Valid MV3 manifest, side panel, SW init, typed messaging, permission handling, unsupported-page errors | `public/manifest.json`, `src/background/index.ts`, `src/panel/`, `src/shared/messaging/` | planned |
| FR-02 | Identify active tab, URL/origin validation, on-demand host permissions, graceful inaccessibility | `src/background/tabs/tabInspector.ts`, `src/background/permissions/PermissionManager.ts` | planned |
| FR-03 | Same-origin route discovery (anchors, SPA, user URLs); normalization, dedupe, loop detection, exclusions | `src/content/discovery/routeDiscovery.ts`, `src/shared/url/**`, `src/shared/safety/dangerousRouteRules.ts` | planned |
| FR-04 | Element discovery: buttons/links/inputs/selects/tabs/menus/dialogs/custom; a11y names; shadow DOM; iframe limits explicit | `src/content/discovery/elementDiscovery.ts`, `src/shared/dom/accessibleName.ts` | planned |
| FR-05 | Interaction automation with pre/post validation, stability waits, no identical-state repeats | `src/content/interaction/**`, `src/background/exploration/scheduler.ts` | planned |
| FR-06 | Risk classes; never auto execute payments/delete/account/external-send; label alone insufficient; user exclusions | `src/shared/safety/**` | planned |
| FR-07 | Initial/before/after/dialog/error/full-page screenshots with DPR/scroll/sticky handling + metadata | `src/background/screenshots/**` | planned |
| FR-08 | Route graph ⊥ UI-state graph; fingerprints from URL + DOM + inventory + overlays + a11y | `src/shared/fingerprint/**`, `src/db/**` | planned |
| FR-09 | Observable diagnostics: JS errors, rejections, console errors, failed requests,HTTP errors, nav/interaction failures | `src/content/diagnostics/**`, `src/content-main/**`, `src/background/diagnostics/**` | planned |
| FR-10 | Report: overview, route explorer, gallery, timeline, before/after, findings; ZIP offline export | `src/report/**`, `src/export/**` | planned |
| All | Configurable exploration limits (§6 table), cancellation, resumable sessions | `src/shared/config/explorationLimits.ts`, `src/background/session/**` | planned |

## Decided product behaviors (from user decisions, 2026-10-31)

1. **Audit target = active tab.** Consent surface on session start + Stop control. Orchestrator may foreground the tab for capture.
2. **High-risk = skip & queue.** Fully unattended sessions; high-risk actions recorded as `skipped:risk` + entries in the review queue with evidence. "User approval" is satisfied by explicit per-item approval in the Review page *before any later manual execution*; the MVP never executes an approved queue item automatically.
3. **Full-page screenshots = scroll-and-stitch** with fixed/sticky suppression, DPR handling, seam metadata, viewport-only fallback.
4. **Permissions**: `activeTab` + `optional_host_permissions` per origin, granted on demand. No `<all_urls>` request at install.
5. **Product name**: `web-ui-auditor` (see AGENTS.md note about folder name).

## Acceptance evidence policy

Each milestone's acceptance criteria (PROMPT §11) are checked off in `PROJECT_PROGRESS.md` **only** with executed evidence (command + result), or explicitly listed as not-runnable with reasons.
