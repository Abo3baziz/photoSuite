# GitHub Setup — web-ui-auditor

> Repository-level settings that cannot be enabled by committing files.
> These require a repository administrator.

## Branch protection / rulesets for `main`

Recommended configuration (GitHub → Settings → Rules → Rulesets, or Branches → Add rule):

- Require a pull request before merging.
- Require 1 approval when another reviewer is available.
- Require all conversations to be resolved.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Block force pushes.
- Block branch deletion.
- Disallow direct pushes to `main`.
- Optionally require linear history.

Required status checks (job names must match exactly):

- `Quality & Tests`
- `Production Extension`
- `Chrome Extension Tests`
- `CodeQL / Analyze`
- `Dependency Review`

> GitHub branch protection and repository rulesets are repository-level settings.
> Creating the workflow YAML files does **not** enable them — an administrator must
> configure them in the GitHub UI or via the REST/GraphQL API.

## CodeQL

Enabled by `.github/workflows/codeql.yml`. Results appear under Security → Code scanning.
No extra setup required beyond the workflow; the default setup can be disabled in
favor of this advanced setup to avoid duplicate analyses.

## Dependabot

Enabled by `.github/dependabot.yml`. Verify under Settings → Code security and analysis →
Dependabot. Grouped minor/patch PRs; majors stay separate.

## Secret scanning and push protection

Enable in Settings → Code security and analysis:

- Secret scanning: on.
- Push protection: on (blocks commits containing detected secrets before push).
- Dependabot alerts: on.

No secrets are committed; workflows use the default `GITHUB_TOKEN` with least-privilege
permissions. Never store credentials in workflow files or logs.

## Chrome Web Store publishing

Intentionally **not** implemented. Future optional integration; requires a separate
workflow with store credentials stored as repository secrets (never in code).
