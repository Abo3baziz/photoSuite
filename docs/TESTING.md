# Testing — web-ui-auditor

> docs/TESTING.md (spec: `docsTESTING.md`). Test architecture, fixture, commands, E2E setup, limitations.

## Test architecture

| Layer | Tooling | Home |
|---|---|---|
| Unit (pure logic) | Vitest, node env where possible | `src/**/*.test.ts` colocated (URL rules, safety rules, fingerprint, schemas, scheduler math, accessible-name) |
| Component (panel) | Vitest + jsdom + React Testing Library | `src/panel/**/*.test.tsx` |
| Persistence | Vitest + `fake-indexeddb` | `src/db/**/*.test.ts` |
| Integration | Vitest with fake chrome-runtime stubs | `tests/integration/**` |
| E2E (extension) | Playwright, persistent context loading unpacked build, Chromium (canary-safe channel documented below) | `e2e/**` |

- `shared/` has no browser APIs so most logic is node-testable without mocks.
- Chrome API mocks: hand-rolled minimal typed stubs (no heavy library); validated against real API in E2E.
- **Honesty policy**: test counts and pass/fail only from executed runs; unrunnable suites listed with reasons (e.g., platform-specific behaviors untestable in CI sandbox).

## Fixture application (`src/fixture-site/`)

Static Vite-served (or `pnpm fixture` port) multi-page + SPA mixed site intentionally containing:

- Same-origin routes `/`, `/products`, `/products/:id` (3), `/about`, `/gallery`, `/forms`, `/tabs`, `/menus`, `/modals`, `/dashboard` (SPA), `/long-page`, `/lazy`, `/errors`
- Buttons, links, inputs, checkboxes, radios, selects, tabs (native + `role=tablist`), nested menus (`role=menu`), modals, disclosure widgets
- Validation errors on submit-ready forms (but destructive checkout is protected by safety rules fixture)
- Disabled controls, custom accessible controls, dead anchors, external links (`https://example.com` in E2E-blocked form)
- Console errors, failed network requests, long scrollable page with fixed header + sticky footer, lazy `loading=lazy` images

## E2E setup

- Build extension (`pnpm build`) → launch Playwright Chromium (channel: `chrome` if present, else bundled Chromium; documented difference) with `--load-extension=dist` and a persistent profile. Headed mode is used (extension APIs under `--headless=new` have historically been partial; the exact channel and mode used will be documented after first E2E run on this machine).
- Panel pages tested by opening `chrome-extension://<id>/panel.html` (idable) and via `chrome.sidePanel` behavior where scriptable.

## Commands

```
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint + prettier check
pnpm test               # vitest run
pnpm test:ui            # vitest --ui
pnpm build              # vite build → dist/
pnpm e2e                # playwright test
pnpm fixture            # serve fixture site for E2E/dev
```

## Known limitations (update as discovered)

- Playwright cannot drive `chrome.sidePanel` UI visibility in all headless contexts; tests target panel URL directly.
- `captureVisibleTab` in headless requires Chromium ≥ 132 targeted; flake margins documented per-run.
- MAIN-world console instrumentation can't be asserted from Playwright's own console listener (separate counters) — asserted through the extension's own storage after waiting for flush.
