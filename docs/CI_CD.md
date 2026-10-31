# CI/CD — web-ui-auditor

> How the GitHub Actions workflows, local checks, and release packaging fit together.

## Workflows (`.github/workflows/`)

| Workflow | File | Trigger | Job name (required check) | Purpose |
|---|---|---|---|---|
| CI | `ci.yml` | PR/push to `main` | `Quality & Tests` | Lint, format, typecheck, unit/component tests |
| Build | `build.yml` | PR/push to `main` | `Production Extension` | Production build + manifest/resource validation |
| E2E | `e2e.yml` | PR/push to `main` | `Chrome Extension Tests` | Playwright against the unpacked extension + local fixture site |
| CodeQL | `codeql.yml` | PR/push to `main`, weekly (Mon 05:33 UTC) | `Analyze` | Static security analysis (JS/TS, `security-extended`) |
| Dependency Review | `dependency-review.yml` | PR to `main` | `Dependency Review` | Blocks new high+ vulnerabilities and AGPL-3.0 licenses |
| Release | `release.yml` | push of `v*` tag | `Quality & Tests` → `Package & Release` | Validated release ZIP + SHA-256 + GitHub Release |

All workflows use least-privilege `GITHUB_TOKEN` permissions and pin third-party actions to full commit SHAs (see `.github/dependabot.yml` for automated SHA bumps).

## Required checks for `main`

Configure these as required in repository rulesets (see `docs/GITHUB_SETUP.md`):

- `Quality & Tests`
- `Production Extension`
- `Chrome Extension Tests`
- `CodeQL / Analyze`
- `Dependency Review`

## Artifact locations

- `extension-production` (build.yml): `dist/` (7-day retention).
- `e2e-report` (e2e.yml, on failure): `playwright-report/`, `test-results/`.
- Release (release.yml): `artifacts/web-ui-auditor-<tag>.zip` + `.sha256` attached to the GitHub Release.

## Local reproduction

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm build:validate
pnpm e2e            # needs Chromium installed (pnpm exec playwright install chromium)
```

Release packaging (reproducible):

```powershell
$env:GITHUB_REF_NAME = 'v0.1.0'
pnpm check:release-tag
pnpm package:release     # writes artifacts/web-ui-auditor-v0.1.0.zip + .sha256
```

## Troubleshooting

- **`pnpm install --frozen-lockfile` fails**: the lockfile is out of date; run `pnpm install` locally and commit `pnpm-lock.yaml`.
- **E2E cannot find Chromium**: run `pnpm exec playwright install chromium` (use `--with-deps` on Linux/CI).
- **Extension does not load in Playwright**: the `chromium_headless_shell` binary does not support extensions; the config uses the full `chromium` channel (new headless).
- **Permission prompts in E2E**: Chrome's native extension permission prompt cannot be automated in headless Chromium. The inspect-after-grant path is covered by integration tests with chrome stubs; the E2E suite verifies the pre-grant guard and settings persistence instead.
- **Release tag mismatch**: `scripts/check-release-tag.mjs` compares the tag to `package.json` `version`; bump one or the other.
- **Non-deterministic ZIP**: packaging uses fixed mtimes, sorted entries, and fixed compression level; if hashes differ between runs, check that `dist/` itself is byte-identical (Vite content hashes must not drift).

## Coverage policy

Coverage tooling is intentionally **not** wired into CI yet: the codebase is small and engines (M2+) are not implemented. Coverage reports will be added together with the discovery/interaction engines, with a threshold gate at that point (see PROJECT_PROGRESS.md). This is a documented deferral, not a skipped script.
