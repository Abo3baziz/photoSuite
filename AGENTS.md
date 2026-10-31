# AGENTS.md — Repository Working Agreement

Rules for humans and AI agents working in this repository.

## Product

**web-ui-auditor** — a Chrome Manifest V3 extension that audits websites: discovers same-origin routes and interactive elements, executes *safe* interactions, captures screenshots of UI states, collects diagnostics, persists audit history locally, and produces an interactive offline report.

> Note: the repository directory is `photoSuite` for historical reasons; the package, product, and documentation refer to `web-ui-auditor`.

## Non-negotiable architecture rules

1. **Module boundaries are explicit.** `shared/` is pure, dependency-free TypeScript (no `chrome.*`, no DOM, no React). `background/`, `content/`, `panel/`, `db/`, `report/`, `export/` may import `shared/`; they must not import each other's internals — only their public entry modules.
2. **No business logic in React components.** Components render state from a Zustand store fed by background messages / repositories. Logic lives in engines.
3. **No `any`, no unsafe assertions.** TypeScript `strict` is on. Prefer discriminated unions. All cross-context data is validated with Zod before use.
4. **Everything that crosses a context boundary is a typed message** defined in `shared/messaging/`. Content scripts and the panel never `import` background modules.
5. **Data access only through repositories** (`db/repositories/`). Do not open Dexie tables ad hoc.
6. **All persistence flows through the storage engine.** The background service worker is never the only holder of audit progress; it must be resumable after suspension.
7. **Safety policy lives in `shared/safety/**`** and is enforced identically everywhere an action can be executed or suggested (including future AI — which is *out of scope* for the MVP and must not be implemented, only accommodated by clean interfaces).
8. **No external network calls, telemetry, eval, or unsafe HTML injection.** Exported/imported metadata is Zod-validated.
9. **Keep the content script lightweight**: selective observers, deduped scans, cleanup of listeners.

## Coding standards

- Language: TypeScript (strict, `noUncheckedIndexedAccess`).
- Style: ESLint (`typescript-eslint`, `react-hooks`, `react-refresh`) + Prettier.
- Naming: files `camelCase.ts`; classes/types `PascalCase`; entities nouns; engines end in `Engine`/`Manager` only when they own lifecycle.
- Errors: explicit `Result`-style unions or thrown domain errors; no silent catches.
- IDs: stable, deterministic where derivation is possible (e.g., element identity hash); time-based otherwise. See `docs/DATA_MODEL.md`.

## Testing expectations

- Unit tests for all pure logic (URL rules, classification, fingerprinting, schemas, scheduling).
- Vitest + jsdom + React Testing Library for panel components; Vitest + `fake-indexeddb` for database repositories.
- Playwright E2E with a loaded unpacked extension against `src/fixture-site/`.
- **Never report a test as passing unless it actually ran and passed.** Document anything un-executable and why (see `docs/TESTING.md`).
- Every fixed bug gets a regression test.

## Security constraints

- Least-privilege permissions: `sidePanel`, `storage`, `tabs`, `activeTab`, `scripting`, `downloads` (report save), `webNavigation`; `optional_host_permissions` for per-origin grants.
- Never collect passwords or payment data; never transmit site content anywhere; everything stays local (IndexedDB/chrome.storage/disk via user-triggered export).
- Never auto-execute destructive or irreversible actions. Risk classification is label-independent — it is one signal among structural signals.

## Repository workflow (GitHub Flow)

- Work on feature branches from `main`: `feature/*`, `bugfix/*`, `refactor/*`, `docs/*`, `test/*`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`).
- Never commit directly to `main`. No history rewrites without authorization. No push/PR without explicit authorization.
- Run typecheck + lint + relevant tests before committing.

## Quality gates per milestone

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` (+ E2E where applicable) must pass before a milestone is declared done, and `PROJECT_PROGRESS.md` must be updated.

## Documentation requirements

- Keep `docs/` and `PROJECT_PROGRESS.md` describing the **actual implemented state**, not aspirations.
- Update docs in the same change as the behavior they describe.
