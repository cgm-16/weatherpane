## T22 — Finalize end-to-end smoke coverage, demo mode, README, and deployment docs

**Issue:** `WP-022`  
**Prerequisites:** `T14`, `T15`, `T17`, `T18`, `T19`, `T20`, `T21`  
**Relevant skills:** `testing-and-mocks`, `github-flow-and-release`

```text
You are implementing T22 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/testing-and-mocks.md
- docs/skills/github-flow-and-release.md

Goal:
Finish the project with deterministic smoke coverage, dev demo support, and developer/submission documentation.

Requirements:
- Playwright smoke suite must cover:
  1. first visit current-location success/fallback
  2. search -> detail -> active location
  3. favorites add/remove/reorder + persistence
  4. theme persistence
  5. recents persistence
- Prefer mocked API responses in tests and local demo mode.
- Implement the dev-only in-app mock/demo toggle if not already present, but ensure production does not silently fall back to demo.
- Add/update README with:
  - project setup
  - env configuration
  - mock vs real provider mode
  - test commands
  - build/deploy steps
  - architecture summary
  - key technical decisions
- Add docs for asset manifest expectations and current limitations.
- Ensure production behavior on missing/invalid config is explicit error state, not demo fallback.

Testing:
- Complete the Playwright smoke suite.
- Ensure screenshots/traces are produced usefully for debugging.
- Verify lint, typecheck, build, unit tests, and e2e all pass.

Integration / wiring:
- Remove outdated placeholder text and stale docs.
- The project should now be usable by a developer immediately.

Definition of done:
- The repo is implementation-complete for MVP scope and can be handed off cleanly.
```
