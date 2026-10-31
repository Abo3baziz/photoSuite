# AGENTS.md

# Project Development Guidelines

## 1. Purpose

This file defines the development rules and expectations for anyone contributing to this repository, including AI coding agents and human developers.

The goal is to maintain a reliable, secure, understandable, and maintainable Chrome extension.

All contributors must follow these guidelines unless a project-specific requirement explicitly overrides them.

When instructions conflict, prioritize:
1. Security and user safety.
2. Correctness and existing project architecture.
3. Explicit project requirements.
4. These development guidelines.
5. Personal implementation preferences.

---

## 2. Before Making Changes

Before implementing anything:

1. Read this file completely.
2. Read `PROJECT_PROGRESS.md` if it exists.
3. Review relevant documentation under `docs/`.
4. Inspect the existing implementation before modifying it.
5. Understand how the affected components interact.
6. Check existing tests and conventions.
7. Identify potential regressions and dependencies.

Do not assume that an existing implementation is incorrect simply because you would have implemented it differently.

Do not rewrite working code unnecessarily.

### Ask questions when necessary

If an important requirement or architectural decision is unclear:

- Ask me before making a consequential decision.
- Explain the available options.
- Describe the advantages and disadvantages of each option.
- Recommend an approach and explain why.

Do not ask questions about minor implementation details that can be reasonably decided by inspecting the codebase.

Make sensible low-impact decisions independently and document important ones.

Never invent requirements or silently make assumptions that could significantly affect the product.

---

## 3. Engineering Principles

Follow these principles throughout the project:

- Prefer simple, readable solutions.
- Keep implementations focused and avoid unnecessary abstractions.
- Follow separation of concerns.
- Avoid duplicated logic.
- Keep modules and components reasonably small.
- Use descriptive names for variables, functions, classes, and files.
- Prefer composition over unnecessary inheritance.
- Avoid premature optimization.
- Avoid introducing dependencies without a clear reason.
- Preserve existing functionality unless a change explicitly requires otherwise.

Do not introduce a design pattern just because it is popular.

Every abstraction should solve an actual problem.

### Code quality

- Use TypeScript strict mode.
- Avoid `any`.
- Use explicit types where they improve clarity.
- Avoid unnecessary type assertions.
- Handle errors explicitly.
- Avoid empty catch blocks.
- Avoid deeply nested conditionals where simpler structures are possible.
- Avoid large functions responsible for unrelated operations.
- Do not leave dead code or unused imports.
- Do not leave unexplained TODOs or placeholder implementations.

Do not hide errors simply to make tests pass.

---

## 4. Project Architecture

Respect the existing architecture documented in `docs/ARCHITECTURE.md`.

Keep responsibilities separated.

The extension should maintain clear boundaries between:

- Background service worker.
- Content scripts.
- Side panel UI.
- Audit orchestration.
- Route discovery.
- Element discovery.
- Interaction execution.
- Safety validation.
- Screenshot capture.
- Diagnostics.
- Local persistence.
- Report generation.

### Architecture rules

- Avoid direct dependencies between unrelated modules.
- Keep business logic outside presentation components.
- Avoid putting application logic inside React components when it belongs in a dedicated module.
- Use well-defined interfaces between major subsystems.
- Validate external and persisted data at appropriate boundaries.
- Handle service worker suspension and recovery correctly.
- Avoid relying on undocumented browser behavior.
- Use Chrome extension APIs according to Manifest V3 requirements.

Do not introduce AI functionality into the initial version.

Future AI functionality must use the existing audit engine and must never bypass interaction safety checks.

---

## 5. Security and User Safety

Security is a core requirement, not an optional improvement.

### Browser interactions

- Revalidate elements before interacting with them.
- Check visibility and enabled state.
- Avoid interacting with stale DOM references.
- Classify actions according to their risk.
- Require approval or block actions according to the defined safety policy.
- Never assume an action is safe based only on its accessible name or button text.

The extension must not automatically perform destructive or irreversible actions.

Examples include:

- Payments and purchases.
- Account deletion.
- Sending emails or messages.
- Changing passwords.
- Deleting important data.
- Submitting sensitive forms.
- Logging out of user accounts.

### Data protection

- Keep audit data local by default.
- Do not transmit website content or screenshots to external services.
- Do not collect passwords, payment information, or unnecessary personal data.
- Avoid logging sensitive form values.
- Use minimum required Chrome permissions.
- Validate imported data and exported files.
- Never commit secrets, tokens, credentials, or private configuration.

When a security concern is discovered, explain its impact and address it rather than ignoring it.

---

## 6. Testing Requirements

Every meaningful change must be tested.

Choose tests appropriate to the change.

### Unit tests

Use unit tests for isolated functionality, including:

- Route normalization.
- Element identification.
- Risk classification.
- URL validation.
- State fingerprinting.
- Data validation.
- Report generation.

### Integration tests

Test interactions between major subsystems.

Examples:

- Route discovery and navigation.
- Element discovery and interaction execution.
- Screenshot capture and persistence.
- Audit orchestration and recovery.
- Diagnostics and report generation.

### End-to-end tests

Use Playwright to test the actual Chrome extension.

Test important user workflows, including:

- Extension startup.
- Side panel behavior.
- Website inspection.
- Route discovery.
- Safe interactions.
- UI state discovery.
- Screenshot capture.
- Local persistence.
- Report generation.
- Dangerous action prevention.

Use a dedicated local fixture website for repeatable tests.

Do not make automated tests depend on random third-party websites.

### Before completing a task

Run the relevant checks:

- ESLint.
- TypeScript type checking.
- Formatting validation.
- Relevant unit tests.
- Relevant integration tests.
- Relevant E2E tests.
- Production build when appropriate.

If a check cannot be executed, explain why.

Never claim that tests passed if they were not executed.

Do not remove or weaken tests merely to make an implementation pass.

---

## 7. Git and GitHub Workflow

Follow GitHub Flow.

### Branching

Never work directly on `main`.

Create a separate branch for each task.

Use these prefixes:

| Prefix | Purpose |
|---|---|
| `feature/` | New functionality |
| `bugfix/` | Bug fixes |
| `refactor/` | Code restructuring without intended behavior changes |
| `docs/` | Documentation changes |
| `test/` | Test additions or improvements |
| `chore/` | Maintenance and tooling |
| `hotfix/` | Urgent production fixes |

Examples:

```text
feature/route-discovery
feature/audit-report
bugfix/side-panel-state
refactor/interaction-engine
docs/testing-guide
test/route-discovery
chore/update-dependencies
hotfix/unsafe-form-submission
```

Keep branches focused on one task.

### Commits

Follow Conventional Commits.

Format:

```text
<type>(<scope>): <short description>
```

Common types:

- `feat`: New functionality.
- `fix`: Bug fix.
- `refactor`: Internal restructuring.
- `docs`: Documentation changes.
- `test`: Test-related changes.
- `chore`: Maintenance.
- `build`: Build system changes.
- `ci`: CI/CD changes.
- `perf`: Performance improvements.
- `security`: Security-related changes.

Examples:

```text
feat(discovery): detect interactive elements in shadow DOM

fix(navigation): prevent duplicate visits to the same route

test(interactions): cover disabled button handling

refactor(audit): separate route discovery from orchestration

docs(architecture): document background service worker responsibilities

ci(github): add Chrome extension E2E workflow

chore(deps): update Playwright dependencies
```

### Commit message quality

Commit messages must explain the actual change.

Rules:

1. Use clear, direct language.
2. Describe what changed, not just which files were edited.
3. Include the affected component or area when useful.
4. Keep the subject concise and specific.
5. Use the imperative mood where practical.
6. Do not use vague descriptions.
7. Do not exaggerate the importance of a change.
8. Do not include unnecessary technical details in the subject.

Avoid messages such as:

```text
fix: fix bug

feat: improve functionality

chore: update files

fix: make things work

feat: enhance user experience

refactor: improve code quality
```

Prefer:

```text
fix(discovery): ignore hidden navigation links

feat(report): show failed interactions separately

fix(storage): restore audit metadata after browser restart

refactor(screenshots): move image persistence into repository

ci(e2e): upload Playwright traces when tests fail
```

### Commit descriptions

For changes that need more explanation, include a body.

Example:

```text
fix(audit): prevent repeated navigation to the same route

Normalize URLs before adding them to the visited-route set.
This prevents query parameter ordering from causing duplicate
visits during route discovery.

Add regression tests for normalized URL comparison.
```

The body should explain:
- What changed.
- Why it was necessary.
- Any important implementation details.
- Relevant limitations when applicable.

Do not write a body just to repeat the subject.

### Avoid AI-sounding commit messages

Commit messages and descriptions must sound like ordinary engineering communication.

Avoid:
- Generic phrases such as "enhance overall experience".
- Unnecessary marketing language.
- Excessive adjectives.
- Repeated summaries of obvious changes.
- Artificially formal language.
- Claims that are not supported by the implementation.
- Emojis unless explicitly requested.

Write as if explaining the change to another developer who will maintain this codebase.

Do not mention that AI generated the change.

### Pull requests

All changes must go through pull requests targeting `main`.

A PR should include:

1. A descriptive title.
2. A short explanation of the problem.
3. What was changed.
4. Important implementation decisions.
5. Tests performed.
6. Screenshots for UI changes where relevant.
7. Known limitations.

Keep PRs focused and reasonably small.

Do not combine unrelated features, refactoring, and dependency updates into one PR unless there is a clear reason.

Do not merge a PR or modify repository protection settings without authorization.

---

## 8. Documentation

Documentation is part of the implementation.

Keep documentation consistent with the actual codebase.

Important project documents:

```text
AGENTS.md
PROJECT_PROGRESS.md

docs/
├── ARCHITECTURE.md
├── REQUIREMENTS.md
├── DATA_MODEL.md
├── IMPLEMENTATION_PLAN.md
├── TECHNICAL_DECISIONS.md
├── TESTING.md
├── CI_CD.md
└── GITHUB_SETUP.md
```

### Documentation rules

- Update documentation when architecture or behavior changes.
- Document important design decisions and their reasoning.
- Document limitations and known issues.
- Prefer concrete examples over vague explanations.
- Do not document functionality that does not exist.
- Remove outdated instructions when replacing an implementation.
- Avoid duplicating the same information across multiple documents.

### PROJECT_PROGRESS.md

Keep this file updated when meaningful milestones are completed.

Record:

- Completed work.
- Current implementation status.
- Remaining tasks.
- Known issues.
- Important decisions.
- Relevant next steps.

Do not turn it into a detailed log of every file modification.

---

## 9. Dependencies and Tooling

Before adding a dependency:

1. Check whether the functionality already exists in the project.
2. Consider whether native APIs are sufficient.
3. Evaluate maintenance and security.
4. Consider package size and performance.
5. Explain why the dependency is necessary when the decision is significant.

Prefer established, maintained dependencies.

Use the existing package manager and lockfile.

Do not introduce another package manager.

Avoid unnecessary dependency upgrades unrelated to the task.

---

## 10. Performance and Reliability

The extension should remain responsive when inspecting complex websites.

Pay attention to:

- Large DOM trees.
- Repeated DOM queries.
- Mutation observers.
- Long-running audit sessions.
- Screenshot storage.
- IndexedDB operations.
- Service worker suspension.
- Memory consumption.
- Event listener cleanup.
- Navigation loops.
- Duplicate interactions.

Use reasonable limits for routes, actions, retries, and execution time.

Support cancellation where appropriate.

An interrupted audit should not corrupt previously saved results.

Do not sacrifice safety or correctness for speed.

---

## 11. Error Handling and Logging

Errors should be understandable and actionable.

- Use consistent error handling.
- Preserve useful diagnostic information.
- Avoid swallowing exceptions.
- Avoid exposing sensitive data in logs.
- Distinguish between application errors, website errors, and browser limitations.
- Provide useful messages in the UI.
- Record failed interactions with enough context to investigate them.

Do not report an interaction as successful merely because no exception was thrown.

Verify that the expected UI state change occurred where practical.

---

## 12. Implementation Expectations

For every task:

1. Understand the requirement.
2. Inspect the existing implementation.
3. Identify affected modules.
4. Plan the smallest reasonable solution.
5. Implement the change.
6. Add or update tests.
7. Run relevant validation.
8. Update documentation when necessary.
9. Review the diff for unrelated changes.
10. Provide a clear summary.

Do not:
- Modify unrelated files.
- Reformat entire files without a reason.
- Introduce unnecessary abstractions.
- Remove existing functionality without approval.
- Commit unfinished or untested work.
- Push branches without permission.
- Create pull requests without permission.
- Claim completion when important requirements remain unmet.

---

## 13. Final Response Format

After completing a task, provide a concise engineering summary.

Use this structure:

### Summary
Explain what was implemented in plain language.

### Changes
List the important files and modules modified.

### Testing
List the checks actually executed and their results.

### Decisions
Explain important implementation choices.

### Remaining Work
Mention unresolved issues, limitations, or manual steps.

### Commit
Suggest a Conventional Commit message when relevant.

Be specific and honest.

Avoid generic statements such as:
- "Everything is working perfectly."
- "The implementation is fully optimized."
- "All issues have been resolved."

Only make claims that can be supported by the actual changes and test results.

---

## 14. General Rule

Write code for the next developer who will maintain it, not just for the current task.

Prefer understandable code, useful documentation, meaningful tests, and descriptive Git history over unnecessary complexity.

When in doubt, choose the solution that is easiest to understand, verify, and maintain.