# Task: Implement Professional GitHub Actions CI/CD and Repository Automation

## Objective

Implement a professional, secure, and maintainable GitHub workflow for this Chrome-only Manifest V3 browser extension.

The goal is to automate code quality checks, testing, production builds, browser-based E2E testing, security analysis, dependency management, and release packaging.

The implementation must integrate with the existing codebase rather than introduce an unrelated workflow or unnecessary dependencies.

## 1. Repository Analysis — Required First Step

Before making changes:

1. Inspect the complete repository structure.
2. Read `AGENTS.md`, `PROJECT_PROGRESS.md`, and existing documentation if available.
3. Identify:
   - Package manager and lockfile.
   - Node.js and pnpm versions.
   - Existing scripts in `package.json`.
   - TypeScript configuration.
   - ESLint and formatting configuration.
   - Testing framework and existing tests.
   - Build tool and production output directory.
   - Manifest V3 configuration.
   - Existing GitHub Actions workflows.
   - Current branching and release conventions.
4. Identify which workflows and automation already exist.
5. Reuse existing configurations wherever possible.

**Do not blindly overwrite existing workflows, scripts, or configurations.**

If an existing implementation already satisfies a requirement, retain it and improve it only where necessary.

If a consequential architectural or security decision is unclear, ask me before proceeding. Explain the available options and their trade-offs. Make reasonable low-impact decisions independently and document them.

## 2. GitHub Actions Workflows

Create or improve the following workflows inside `.github/workflows/`.

### A. `ci.yml` — Continuous Integration

Triggers:
- Pull requests targeting `main`.
- Pushes to `main`.

Required checks:

1. Checkout repository.
2. Set up the correct Node.js version.
3. Set up pnpm.
4. Enable dependency caching where appropriate.
5. Install dependencies using the frozen lockfile.
6. Run ESLint.
7. Run TypeScript type checking.
8. Run formatting validation.
9. Run unit tests.
10. Run integration tests.
11. Generate test coverage reports.

Requirements:
- Fail immediately when a required check fails.
- Do not silently skip missing scripts.
- Use existing package scripts whenever possible.
- Avoid duplicating checks already performed by other workflows.
- Upload coverage reports as artifacts when useful.
- Introduce a reasonable coverage threshold only after inspecting existing test coverage and discussing its implications.

### B. `build.yml` — Production Build Validation

Triggers:
- Pull requests targeting `main`.
- Pushes to `main`.

Requirements:

1. Install dependencies.
2. Build the production extension.
3. Validate the production output.
4. Validate `manifest.json`.
5. Verify that all required manifest resources exist in the build output.
6. Validate the background service worker, content scripts, side panel, icons, and other configured resources.
7. Check for accidental development-only configuration in the production output.
8. Upload the production build as a GitHub Actions artifact.

The validation must account for the actual build tool and output structure.

Do not assume a specific output directory without inspecting the repository.

### C. `e2e.yml` — Chrome Extension End-to-End Testing

Triggers:
- Pull requests targeting `main`.
- Pushes to `main`.

Use Playwright with Chromium to test the actual unpacked extension.

Requirements:

1. Install the browser and required system dependencies.
2. Build the extension.
3. Load the unpacked extension into a Chromium browser.
4. Launch a local test website.
5. Execute E2E tests against the extension.
6. Generate Playwright HTML reports.
7. Upload test reports, screenshots, and traces when tests fail.

Test the following functionality:

- Extension installation and startup.
- Background service worker initialization.
- Side panel opening and interaction.
- Content script initialization.
- Route discovery.
- Same-origin navigation.
- SPA navigation.
- Interactive element discovery.
- Button interactions.
- Form interactions.
- Modal and dropdown detection.
- Validation error detection.
- Screenshot capture.
- IndexedDB persistence.
- Audit interruption and recovery where supported.
- Handling inaccessible or stale elements.
- Preventing dangerous interactions.

Create or reuse a dedicated local fixture website.

The fixture should include:
- Multiple routes.
- SPA navigation.
- Navigation menus.
- Buttons.
- Forms.
- Inputs and select elements.
- Checkboxes and toggles.
- Modals.
- Dropdowns.
- Validation errors.
- Long pages.
- Lazy-loaded content.
- Failed resource requests.
- Dangerous actions that must never execute automatically.

Do not make CI depend on arbitrary external websites.

### D. `codeql.yml` — Static Security Analysis

Triggers:
- Pull requests targeting `main`.
- Pushes to `main`.
- Weekly scheduled execution.

Requirements:

- Configure GitHub CodeQL for JavaScript and TypeScript.
- Use the recommended security query suite.
- Upload analysis results to GitHub Code Scanning.
- Avoid unnecessary duplicate analyses.
- Follow current GitHub CodeQL Action recommendations.

Document how to interpret and resolve findings.

### E. `dependency-review.yml` — Dependency Security

Trigger:
- Pull requests targeting `main`.

Requirements:

- Use GitHub Dependency Review.
- Detect newly introduced dependencies with known vulnerabilities.
- Configure an appropriate vulnerability severity threshold.
- Fail the workflow for dependencies violating the defined policy.
- Provide useful workflow output explaining the failure.

Do not block ordinary dependency updates without a documented security reason.

### F. `release.yml` — Production Release Automation

Trigger:
- Pushes of version tags matching `v*`.

Example:
- `v1.0.0`
- `v1.1.0`
- `v2.0.0`

Requirements:

1. Validate the tag format.
2. Install dependencies using the frozen lockfile.
3. Run all relevant quality checks and tests.
4. Build the production extension.
5. Validate the production build and manifest.
6. Package the production output into a ZIP file.
7. Generate a SHA-256 checksum.
8. Create a GitHub Release.
9. Attach the extension ZIP and checksum.
10. Include release notes.

Security requirements:
- Use minimal permissions.
- Grant release write permissions only to the release job.
- Do not expose release credentials to ordinary CI jobs.
- Avoid duplicate releases when rerunning a workflow.
- Make release artifacts reproducible where reasonably possible.

Do not implement Chrome Web Store publishing in this phase. Keep it as a future optional integration.

## 3. Dependabot Configuration

Create `.github/dependabot.yml`.

Configure updates for:

- npm/pnpm dependencies.
- GitHub Actions dependencies.

Requirements:

- Use the actual package ecosystem supported by the repository.
- Group non-breaking dependency updates where practical.
- Avoid creating excessive PRs.
- Use meaningful commit prefixes.
- Keep major dependency upgrades distinguishable from routine updates.
- Schedule updates weekly.

## 4. Repository Templates and Configuration

Create or improve the following:

### Pull Request Template

`.github/pull_request_template.md`

Include:

- Summary.
- Related issue.
- Type of change.
- Implementation details.
- Testing performed.
- Screenshots or recordings for UI changes.
- Security implications.
- Documentation updates.
- Checklist.

### Issue Templates

Create GitHub issue forms for:

- Bug reports.
- Feature requests.

Allow blank issues if the repository owner wants to retain the ability to create ordinary issues.

### CODEOWNERS

Create `.github/CODEOWNERS` only if actual maintainers or ownership information is known.

Never invent GitHub usernames.

### Secret Scanning

Document how to enable:

- Secret scanning.
- Push protection, if available.
- Dependabot alerts.

Do not commit secrets or expose credentials in workflow logs.

## 5. GitHub Repository Rulesets

Create documentation explaining how to configure branch protection or repository rulesets for `main`.

Recommended settings:

- Require pull requests before merging.
- Require one approval when another reviewer is available.
- Require all conversations to be resolved.
- Require status checks to pass.
- Require branches to be up to date.
- Block force pushes.
- Block branch deletion.
- Disallow direct pushes to `main`.
- Optionally require linear history.

Recommended required checks:

- CI / Quality & Tests
- Build / Production Extension
- E2E / Chrome Extension Tests
- CodeQL / Analyze
- Dependency Review

**Important:** GitHub branch protection and repository rulesets are repository-level settings. Do not claim they have been enabled merely because documentation or YAML files were created.

If GitHub API access is available, inspect existing rulesets before proposing changes. Never modify repository settings without my explicit approval.

## 6. Security Requirements

All workflows must follow these principles:

1. Apply least-privilege `GITHUB_TOKEN` permissions.
2. Pin third-party GitHub Actions to verified full commit SHAs.
3. Avoid unnecessary write permissions.
4. Never expose secrets to untrusted pull-request code.
5. Avoid unsafe use of `pull_request_target`.
6. Never execute untrusted code with privileged repository credentials.
7. Use supported and maintained GitHub Actions.
8. Avoid unnecessary `debugger` permissions or browser privileges in the extension itself.
9. Do not introduce external telemetry or services.
10. Avoid downloading and executing arbitrary scripts during CI.

Review workflow permissions and potential supply-chain risks.

## 7. Documentation

Create or update:

- `docs/CI_CD.md`
- `docs/GITHUB_SETUP.md`
- `docs/TESTING.md`

Documentation must explain:

### CI/CD
- Each workflow's purpose.
- Trigger conditions.
- Required checks.
- Workflow dependencies.
- Artifact locations.
- How to troubleshoot failures.

### GitHub Setup
- How to configure branch protection.
- Which checks should be required.
- How to enable CodeQL.
- How to enable Dependabot.
- How to enable secret scanning and push protection.
- Any settings requiring repository administrator access.

### Testing
- How to run unit tests locally.
- How to run integration tests.
- How to run Playwright E2E tests.
- How to generate and inspect coverage reports.
- How to reproduce CI failures locally.

Update `AGENTS.md` and `PROJECT_PROGRESS.md` if they exist and their conventions require it.

## 8. Engineering Constraints

- TypeScript strict mode.
- No `any` unless explicitly justified.
- Avoid unnecessary dependencies.
- Reuse existing tooling.
- Keep workflows modular and understandable.
- Avoid duplicated workflow logic.
- Use YAML anchors or reusable workflows only when they materially improve maintainability.
- Use clear job and step names.
- Set appropriate timeouts.
- Cache dependencies safely.
- Avoid unnecessary matrix builds.
- Do not introduce paid services.
- Do not introduce a backend.
- Do not introduce AI functionality.
- Do not modify application behavior unrelated to CI/CD.

Follow the repository's existing GitHub Flow and Conventional Commits conventions.

Do not push branches, create PRs, publish releases, or modify repository-level settings without my explicit permission.

## 9. Implementation Milestones

Implement progressively:

**Milestone 1 — Repository Analysis**
- Inspect the existing repository.
- Identify existing automation.
- Document gaps.
- Present a concise implementation plan.

**Milestone 2 — CI and Build**
- Implement `ci.yml`.
- Implement `build.yml`.
- Verify both workflows.

**Milestone 3 — E2E**
- Implement `e2e.yml`.
- Prepare the fixture website.
- Verify extension loading and automated interactions.

**Milestone 4 — Security**
- Implement CodeQL.
- Implement dependency review.
- Configure Dependabot.
- Document secret scanning.

**Milestone 5 — Release**
- Implement release packaging.
- Generate checksums.
- Verify the release workflow without publishing a real release.

**Milestone 6 — Repository Configuration**
- Add PR and issue templates.
- Add CODEOWNERS if applicable.
- Document branch protection and rulesets.

**Milestone 7 — Final Verification**
- Validate all YAML files.
- Run available checks locally.
- Verify workflow triggers and permissions.
- Review security risks.
- Update documentation.

Do not move forward with an implementation that depends on an unresolved consequential decision.

## 10. Acceptance Criteria

The task is complete when:

- [ ] CI runs successfully on pull requests.
- [ ] Linting and formatting checks are enforced.
- [ ] TypeScript type checking is enforced.
- [ ] Unit and integration tests execute.
- [ ] Production extension builds successfully.
- [ ] Manifest and packaged resources are validated.
- [ ] Playwright can load and test the unpacked extension.
- [ ] E2E reports and failure artifacts are available.
- [ ] CodeQL analysis is configured.
- [ ] Dependency Review is configured.
- [ ] Dependabot is configured.
- [ ] Release automation creates a ZIP and SHA-256 checksum.
- [ ] PR and issue templates exist.
- [ ] Branch protection instructions are documented.
- [ ] Workflow permissions follow least privilege.
- [ ] Documentation is updated.
- [ ] No existing functionality has been unintentionally broken.

## 11. Final Report

When implementation is complete, provide:

1. Summary of implemented workflows.
2. List of created and modified files.
3. Explanation of each workflow.
4. Tests and validation performed.
5. Any checks that could not be executed and why.
6. Any manual GitHub configuration still required.
7. Security decisions and limitations.
8. Known issues and future improvements.
9. Suggested Conventional Commit message.

Clearly distinguish between:
- Implemented and locally verified.
- Implemented but not verified.
- Requires GitHub administrator configuration.
- Deferred to a future milestone.

**Start with repository analysis. Do not immediately generate all YAML files before understanding the existing project.**