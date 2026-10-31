# Engineering Task Build a Chrome-Based Web UI Auditing Extension

## 1. Role and responsibility

Act as a senior software architect and senior TypeScriptbrowser-extension engineer responsible for designing and implementing a production-quality Chrome extension.

Your task is to build a reusable Web UI Auditor that automatically explores web applications, discovers routes and interactive elements, executes safe interactions, captures screenshots of resulting UI states, collects diagnostics, and generates comprehensive interactive audit reports.

You are responsible for

- Understanding the existing codebase before making changes.
- Making technically justified architectural decisions.
- Designing maintainable and extensible modules.
- Implementing features incrementally.
- Writing comprehensive tests.
- Documenting architectural decisions and limitations.
- Maintaining project progress and implementation documentation.

Do not rush into implementation before understanding the requirements and repository.

---

## 2. Product definition

Build a Chrome-only browser extension using Manifest V3.

The extension must allow developers to audit the current website and its discoverable same-origin routes.

The primary workflow

1. User opens a website.
2. User opens the extension's side panel.
3. User starts a new audit session.
4. Extension discovers website routes.
5. Extension discovers interactive elements on each route.
6. Extension captures initial screenshots.
7. Extension safely interacts with eligible elements.
8. Extension captures screenshots after interactions.
9. Extension records errors, warnings, and interaction results.
10. Extension generates an interactive audit report.
11. User inspects screenshots, interactions, diagnostics, and findings.
12. User exports the audit session.

The extension must work without an external backend or AI provider.

### Initial product scope

- Browser Google Chrome.
- Extension architecture Manifest V3.
- Language TypeScript.
- UI React.
- Styling Tailwind CSS.
- Build Vite.
- Package manager pnpm.
- State management Zustand.
- Persistence IndexedDB using Dexie.js.
- Validation Zod.
- Testing Vitest, React Testing Library, Playwright.
- Export JSZip.
- AI explicitly deferred.
- Backend none.
- Cloud synchronization none.

Check dependency compatibility and use stable compatible versions.

---

## 3. Mandatory first step Repository analysis

Before implementing anything, inspect the existing repository.

Analyze

- Directory structure.
- Existing dependencies.
- Package manager and scripts.
- TypeScript configuration.
- Build configuration.
- Extension manifest, if present.
- Existing UI components.
- Existing architecture and coding conventions.
- Testing infrastructure.
- Documentation.
- Existing implementation progress.

Identify

1. What already exists.
2. What can be reused.
3. What needs modification.
4. What needs to be implemented.
5. Architectural risks.
6. Missing requirements.
7. Technical constraints imposed by Chrome Manifest V3.

Do not overwrite or replace existing working implementations without justification.

If the repository is empty, establish the project structure and configuration.

### Questions and ambiguity

You are allowed and encouraged to ask me questions whenever a technical or product decision cannot be determined reliably from the repository or requirements.

Do not silently make consequential assumptions about

- Product behavior.
- Security and permissions.
- Data persistence.
- Destructive interactions.
- Navigation behavior.
- Screenshot strategy.
- Architectural boundaries.

Present the available options, their trade-offs, and your recommendation when clarification is necessary.

For low-impact implementation details, make reasonable decisions and document them.

Do not repeatedly ask questions whose answers are already available in the repository or project documentation.

---

## 4. Architecture

Implement a modular architecture with explicit boundaries.

### A. Background service worker

Responsibilities

- Audit session orchestration.
- Session lifecycle management.
- Tab and navigation management.
- Communication routing.
- Permission coordination.
- Audit progress persistence.
- Recovery after service-worker suspension.
- Screenshot capture coordination.

The service worker must not be the only place where audit progress is stored.

### B. Content scripts

Responsibilities

- DOM inspection.
- Interactive element discovery.
- Accessibility attribute inspection.
- Visibility and enabled-state detection.
- Element identification.
- Safe interaction execution.
- UI state observation.
- SPA navigation observation.
- Mutation observation.
- Page-level diagnostic instrumentation.

Use isolated-world content scripts for normal inspection.

Keep MAIN-world instrumentation separate and use it only when necessary.

### C. Audit engine

Responsibilities

- Route discovery.
- Route graph construction.
- UI state graph construction.
- Exploration scheduling.
- Interaction deduplication.
- Exploration limits.
- State fingerprinting.
- Coverage tracking.
- Session recovery.

Separate route discovery from interaction exploration.

### D. Interaction engine

Responsibilities

- Element validation.
- Action classification.
- Click execution.
- Input interaction.
- Selection.
- Keyboard interaction.
- Scroll interaction.
- Timeouts.
- Retries.
- Failure recording.
- Safety enforcement.

Use a common action interface with typed action definitions.

### E. Screenshot engine

Responsibilities

- Initial screenshots.
- Beforeafter screenshots.
- Viewport capture.
- Full-page capture through controlled scrolling and stitching.
- Screenshot metadata.
- Artifact persistence.
- Image comparison.

Use Chrome-supported APIs.

Do not assume `captureVisibleTab` captures an entire document.

### F. Diagnostics engine

Responsibilities

- Uncaught exceptions.
- Unhandled promise rejections.
- Observable console errors.
- Observable failed network requests.
- Navigation failures.
- Interaction failures.
- Unexpected page states.
- Diagnostic event persistence.

Document browser observability limitations.

Do not claim complete access to browser console internals or all network traffic.

Do not introduce the Chrome `debugger` permission in the MVP.

### G. Storage engine

Use Dexie.js and IndexedDB.

Persist

- Audit sessions.
- Routes.
- Screen states.
- Discovered elements.
- Interactions.
- Screenshots.
- Diagnostic events.
- Findings.
- State transitions.

Use proper indexes and relationships.

Store screenshot binaries separately from ordinary JSON metadata.

Implement versioned database schema migrations.

### H. Reporting engine

Generate an interactive report with

- Overview dashboard.
- Route explorer.
- Screenshot gallery.
- Interaction timeline.
- Beforeafter comparison.
- Element details.
- Diagnostics.
- Findings.
- Coverage information.
- ZIP export.

The exported report must be usable offline.

---

## 5. Functional requirements

### FR-01 Extension installation and initialization

- Provide a valid Manifest V3 manifest.
- Implement the Chrome side panel.
- Initialize the background service worker.
- Implement typed extension messaging.
- Handle permission requests.
- Display unsupported-page errors clearly.
- Support active-tab auditing.

### FR-02 Website connection

- Identify the active tab.
- Retrieve the current URL and origin.
- Validate supported website URLs.
- Request host permissions only when necessary.
- Avoid unnecessary broad host permissions.
- Handle inaccessible pages gracefully.

### FR-03 Route discovery

Discover same-origin routes through

- Anchor elements.
- Navigation links.
- Menus.
- Interaction-revealed links.
- SPA navigation.
- Browser navigation.
- User-defined starting URLs.

Requirements

- Normalize URLs.
- Deduplicate routes.
- Preserve meaningful query parameters.
- Detect navigation loops.
- Reject external origins.
- Skip dangerous routes.
- Support traditional applications and SPAs.

Implement explicit exclusions for authentication, logout, deletion, and other dangerous routes.

Do not blindly navigate to every URL found in the DOM.

### FR-04 Interactive element discovery

Discover

- Buttons.
- Links.
- Inputs.
- Textareas.
- Select elements.
- Checkboxes.
- Radio buttons.
- Tabs.
- Menus.
- Menu items.
- Dialogs.
- Disclosure controls.
- Accessible custom interactive elements.

Prioritize native HTML semantics and accessible roles.

Do not depend on generated CSS classes as stable identifiers.

Support shadow DOM where accessible.

Handle same-origin and cross-origin iframe limitations explicitly.

### FR-05 Interaction automation

Support

- Click.
- Type.
- Select.
- Toggle.
- Focus.
- Keyboard interaction.
- Scrolling.

Before each action

1. Resolve the target.
2. Verify it still exists.
3. Verify visibility.
4. Verify enabled state.
5. Verify its risk classification.
6. Verify the action is permitted.

After each action

1. Wait for observable stability.
2. Detect state changes.
3. Capture the resulting screenshot.
4. Collect diagnostics.
5. Record the action result.
6. Update coverage.

Do not repeatedly execute actions that produce identical states.

### FR-06 Safety

Implement action risk classification.

- Low risk execute automatically.
- Medium risk execute with appropriate isolation.
- High risk require user approval.
- Critical risk block by default.

Never automatically execute

- Payments.
- Checkout submissions.
- Deletions.
- Account changes.
- External message sending.
- Irreversible operations.

Provide user-configurable exclusions.

Never treat an action as safe based only on its label.

### FR-07 Screenshot capture

Capture

- Initial page state.
- Before interaction.
- After interaction.
- Open dialogs.
- Open dropdowns.
- Validation errors.
- Unexpected error states.
- Full-page screenshots where possible.

Use `chrome.tabs.captureVisibleTab` for visible viewport screenshots.

Implement full-page screenshots using controlled scrolling and image stitching.

Account for

- Device pixel ratio.
- Viewport dimensions.
- Scroll offsets.
- Sticky elements.
- Lazy-loaded content.
- Fixed headers.
- Screenshot timing.

Record metadata for every screenshot.

### FR-08 UI state discovery

Represent routes and UI states separately.

Route graph
- Nodes represent unique routes.
- Edges represent navigation transitions.

UI state graph
- Nodes represent distinct UI states.
- Edges represent interactions.

State fingerprints should combine

- URL.
- Relevant DOM structure.
- Interactive element inventory.
- Modal and overlay state.
- Relevant accessibility information.

Do not rely exclusively on screenshot hashes.

### FR-09 Diagnostics

Collect observable

- JavaScript errors.
- Unhandled promise rejections.
- Console errors through documented instrumentation.
- Failed resource requests.
- HTTP error responses.
- Navigation errors.
- Interaction failures.
- Unexpected state changes.

Associate diagnostic events with the relevant route, state, and interaction whenever possible.

### FR-10 Reporting

Provide

Overview
- Total routes.
- Total states.
- Elements discovered.
- Interactions attempted.
- Successful interactions.
- Failed interactions.
- Skipped interactions.
- Screenshots captured.
- Diagnostic events.
- Coverage.

Route explorer
- Route list.
- Initial screenshots.
- State history.
- Route-specific diagnostics.

Interaction explorer
- Element details.
- Action type.
- Execution result.
- Beforeafter screenshots.
- Duration.
- Associated diagnostics.

Findings
- Severity.
- Category.
- Description.
- Evidence.
- Reproduction steps.
- Verification status.

Export
- HTML report.
- Screenshots.
- JSON metadata.
- Diagnostics.
- Manifest.
- ZIP archive.

---

## 6. Exploration configuration

Provide configurable defaults

 Setting  Default 
------
 Maximum routes  100 
 Maximum actions  500 
 Maximum visits per state  3 
 Maximum exploration depth  10 
 Action timeout  10 seconds 
 Retry count  2 
 Session timeout  30 minutes 

Allow users to configure these values.

Implement cancellation and graceful session termination.

The engine must be resumable after service-worker suspension.

Use stable identifiers and idempotent operations to prevent duplicate execution after recovery.

---

## 7. User interface requirements

Implement a persistent Chrome side panel.

### Overview

Display

- Current website.
- Session status.
- Progress.
- Routes discovered.
- Interactions completed.
- Screenshots captured.
- Errors and warnings.

### Pages

Display

- Discovered routes.
- Route status.
- Initial screenshots.
- UI states.
- Interaction counts.

### Interactions

Display

- Element name.
- Element type.
- Action.
- Status.
- Duration.
- Screenshot references.

### Findings

Display

- Severity.
- Description.
- Evidence.
- Associated screenshots.
- Reproduction steps.

### Settings

Provide

- Exploration limits.
- Route exclusions.
- Element exclusions.
- Action safety settings.
- Screenshot settings.
- Viewport configuration.
- Data management.

The extension interface must be responsive and accessible.

Provide loading, empty, error, and success states.

Do not use fake statistics or placeholder interactions in the finished product.

---

## 8. Data architecture

Define typed domain entities and Zod schemas.

Required entities

- AuditSession.
- Route.
- ScreenState.
- UIElement.
- Interaction.
- Screenshot.
- StateTransition.
- DiagnosticEvent.
- Finding.

Additional requirements

- Stable IDs.
- Timestamps.
- Foreign-key relationships or indexed references.
- Schema versioning.
- Data validation.
- Consistent deletion and cleanup.
- Session-level isolation.

Avoid tightly coupling database models to UI components.

Use repository abstractions for data access.

---

## 9. Engineering requirements

### TypeScript

- Enable strict mode.
- Never use `any`.
- Avoid unsafe type assertions.
- Prefer discriminated unions.
- Validate external and cross-context messages.
- Define explicit interfaces.
- Avoid duplicated domain types.

### Architecture

- Keep modules cohesive.
- Avoid circular dependencies.
- Use dependency injection where useful.
- Keep orchestration separate from implementation details.
- Keep content scripts lightweight.
- Do not create unnecessary abstractions.
- Avoid giant service classes.
- Do not place business logic in React components.

### Browser extension reliability

- Handle service-worker suspension.
- Persist progress frequently.
- Handle tab closure.
- Handle navigation during execution.
- Handle permission revocation.
- Handle content-script disconnection.
- Recover or safely terminate interrupted sessions.

### Security and privacy

- No external telemetry.
- No backend.
- No transmission of website content.
- No hardcoded credentials.
- No `eval`.
- Avoid unsafe HTML injection.
- Validate imported and exported metadata.
- Keep sensitive data local.
- Never collect passwords or payment information.
- Provide session deletion and storage cleanup.

### Performance

- Avoid repeated full DOM scans.
- Use MutationObserver selectively.
- Debounce expensive updates.
- Deduplicate screenshots.
- Limit concurrent operations.
- Use appropriate IndexedDB transactions.
- Avoid blocking the page's main thread.
- Clean up observers and listeners.

---

## 10. Testing strategy

Testing is mandatory.

### Unit tests

Cover

- URL normalization.
- Same-origin validation.
- Route deduplication.
- Element classification.
- Accessible-name extraction.
- Action classification.
- State fingerprinting.
- Exploration scheduling.
- Interaction deduplication.
- Coverage calculations.
- Zod schemas.
- Database repositories.
- Screenshot metadata.

### Integration tests

Cover

- Backgroundcontent-script messaging.
- Content-script discovery.
- Interaction execution.
- SPA navigation.
- State transition recording.
- IndexedDB persistence.
- Session recovery.
- Screenshot metadata and storage.
- Export generation.

### Extension E2E tests

Use Playwright with a loaded unpacked Chrome extension where supported.

Create a dedicated fixture website containing

- Multiple same-origin routes.
- SPA navigation.
- Traditional page navigation.
- Buttons.
- Links.
- Forms.
- Inputs.
- Checkboxes.
- Dropdowns.
- Tabs.
- Nested menus.
- Modals.
- Validation errors.
- Dynamic content.
- Disabled controls.
- Custom accessible controls.
- Destructive actions.
- External links.
- Long pages.
- Lazy-loaded images.
- Console errors.
- Failed network requests.

Verify the extension against this fixture application.

### Regression tests

Every fixed bug must receive a regression test.

### Quality gates

Before completing a milestone, run

- TypeScript type checking.
- Linting.
- Unit tests.
- Relevant integration tests.
- Build verification.
- E2E tests where applicable.

Do not report a test as passing unless it was actually executed successfully.

Document tests that cannot be executed and explain why.

---

## 11. Implementation milestones

Implement the project in the following order.

### Milestone 0 — Repository analysis and design

- Analyze the repository.
- Define architecture.
- Establish module boundaries.
- Define domain models.
- Identify Chrome API constraints.
- Write implementation documentation.
- Identify unresolved decisions.

Deliverables
- `docsARCHITECTURE.md`
- `docsREQUIREMENTS.md`
- `docsDATA_MODEL.md`
- `docsIMPLEMENTATION_PLAN.md`
- `docsTECHNICAL_DECISIONS.md`

Do not begin substantial implementation until the architecture is documented and major ambiguities are resolved.

### Milestone 1 — Extension foundation

Implement

- Manifest V3.
- Vite build.
- TypeScript configuration.
- React side panel.
- Background service worker.
- Content-script injection.
- Typed messaging.
- Permission management.
- Basic settings.

Acceptance
- Extension installs successfully.
- Side panel opens.
- Active tab can be identified.
- Content script can inspect the current page.
- Messages work reliably.
- Unsupported pages produce understandable errors.

### Milestone 2 — Discovery engine

Implement

- Route discovery.
- SPA navigation observation.
- Interactive element discovery.
- Accessibility information.
- Element identifiers.
- Route and element deduplication.

Acceptance
- Discovers fixture website routes.
- Identifies supported interactive elements.
- Handles duplicate links.
- Handles dynamic content.
- Does not leave the current website's origin.

### Milestone 3 — Screenshot and interaction engine

Implement

- Viewport screenshots.
- Initial state capture.
- Beforeafter capture.
- Full-page capture and stitching.
- Action execution.
- Risk classification.
- UI stability detection.
- Interaction recording.

Acceptance
- Captures initial screenshots.
- Executes eligible interactions.
- Captures resulting states.
- Blocks destructive operations.
- Records failures and skipped actions.
- Does not repeat identical actions indefinitely.

### Milestone 4 — State exploration and persistence

Implement

- Route graph.
- UI state graph.
- Exploration scheduler.
- Exploration limits.
- IndexedDB schema.
- Repositories.
- Session recovery.
- Progress tracking.

Acceptance
- Completes bounded exploration.
- Persists progress.
- Resumes safely after worker suspension.
- Prevents duplicate execution.
- Preserves audit history.

### Milestone 5 — Diagnostics

Implement

- Error collection.
- Promise rejection monitoring.
- Observable console instrumentation.
- Network failure monitoring.
- Navigation failure detection.
- Diagnostic association.

Acceptance
- Detects fixture errors.
- Associates errors with routes and interactions where possible.
- Distinguishes confirmed errors from suspicious conditions.
- Documents observability limitations.

### Milestone 6 — Reporting and export

Implement

- Overview dashboard.
- Route explorer.
- Screenshot gallery.
- Interaction timeline.
- Beforeafter comparison.
- Findings.
- Export functionality.

Acceptance
- Report accurately reflects persisted session data.
- Screenshots can be opened and inspected.
- Interactions can be traced.
- Export works offline.
- ZIP contents are complete and validated.

### Milestone 7 — Hardening and release preparation

Implement

- Performance improvements.
- Error handling.
- Accessibility improvements.
- Permission review.
- Data cleanup.
- Regression testing.
- Documentation.
- Chrome installation instructions.

Acceptance
- All critical tests pass.
- Production build succeeds.
- No known destructive automation paths remain.
- No undocumented permissions.
- No critical data-loss issues.
- Installation and usage instructions are complete.

---

## 12. Project documentation and progress tracking

Maintain these documents

### AGENTS.md

Define
- Architecture rules.
- Coding standards.
- Testing expectations.
- Security constraints.
- Repository workflow.
- Documentation requirements.

### PROJECT_PROGRESS.md

Track
- Current milestone.
- Completed tasks.
- In-progress tasks.
- Blocked tasks.
- Known issues.
- Next steps.
- Latest test results.

Update this document after each meaningful implementation milestone.

### docsARCHITECTURE.md

Document
- Module boundaries.
- Component responsibilities.
- Communication flows.
- Extension lifecycle.
- State management.
- Data persistence.

### docsTECHNICAL_DECISIONS.md

Record significant decisions and alternatives.

### docsTESTING.md

Document
- Test architecture.
- Fixture application.
- Test commands.
- E2E setup.
- Known limitations.

Documentation must reflect the actual implementation, not an imagined future architecture.

---

## 13. Git and development workflow

Use GitHub Flow.

- Never commit directly to `main`.
- Use descriptive branch prefixes such as `feature`, `bugfix`, `refactor`, `docs`, and `test`.
- Follow Conventional Commits.
- Keep changes focused.
- Avoid mixing unrelated refactoring with feature implementation.
- Run relevant tests before committing.
- Do not rewrite existing history without authorization.
- Do not push or create pull requests without explicit authorization.

Suggested branch sequence

- `featureextension-foundation`
- `featureroute-discovery`
- `featureelement-discovery`
- `featurescreenshot-engine`
- `featureinteraction-engine`
- `featurestate-exploration`
- `featurediagnostics`
- `featureaudit-reporting`
- `testextension-e2e`
- `refactorreliability-hardening`

---

## 14. Definition of done

The initial release is complete only when

- [ ] Chrome extension installs.
- [ ] Manifest V3 requirements are satisfied.
- [ ] Side panel works.
- [ ] Active website can be audited.
- [ ] Same-origin routes are discovered.
- [ ] SPA navigation is supported.
- [ ] Interactive elements are discovered.
- [ ] Initial screenshots are captured.
- [ ] Screenshots are captured after successful interactions.
- [ ] Dialogs and dropdowns are explored.
- [ ] Full-page capture is supported where possible.
- [ ] Destructive operations are blocked.
- [ ] Interaction history is persisted.
- [ ] UI states are tracked.
- [ ] Console and network diagnostics are collected within documented browser limitations.
- [ ] Audit sessions can recover from service-worker suspension.
- [ ] HTML report is generated.
- [ ] ZIP export works.
- [ ] Data remains local.
- [ ] Unit, integration, and E2E tests cover critical workflows.
- [ ] Documentation is complete.
- [ ] Production build succeeds.

---

## 15. Future extensibility — AI integration (not part of MVP)

Do not implement AI now.

However, avoid architectural decisions that would make future AI integration unnecessarily difficult.

Preserve clean interfaces for future capabilities

- Screenshot analysis.
- AI-generated interaction suggestions.
- Intelligent exploration planning.
- Workflow discovery.
- Visual anomaly assessment.
- AI-generated test scenarios.

Future AI components must use the existing audit engine and safety mechanisms.

The AI agent must never bypass the interaction engine or safety policy.

AI-generated findings must be distinguished from verified failures.

Do not add AI packages, API clients, environment variables, or placeholder AI modules during the MVP.

---

## 16. Execution instructions

Work incrementally.

For each milestone

1. Inspect relevant existing code.
2. Identify implementation requirements.
3. Describe the planned changes.
4. Implement the smallest coherent set of features.
5. Add or update tests.
6. Execute quality checks.
7. Review the implementation for architectural and security issues.
8. Update documentation.
9. Update `PROJECT_PROGRESS.md`.
10. Summarize completed work and remaining tasks.

Do not implement every milestone in a single massive change.

Do not create superficial placeholder implementations merely to satisfy acceptance criteria.

Do not claim support for a feature that only has a UI representation without working functionality.

When browser limitations prevent a requested behavior, explain the limitation and propose the closest technically valid alternative.

Prioritize correctness, reproducibility, maintainability, security, and user experience over implementation speed.

### Final deliverable

A functional, installable Chrome extension that can audit a website, discover its same-origin routes and interactive elements, explore safe interactions, capture screenshots of resulting UI states, collect diagnostics, persist audit history locally, and generate a comprehensive offline-readable report.

Begin with Milestone 0 repository analysis and architecture documentation. Do not start implementation until the initial analysis is complete and any consequential unresolved decisions have been addressed.