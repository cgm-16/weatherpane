## T01 — Bootstrap the app shell and test harness

**Issue:** `WP-001`  
**Prerequisites:** none  
**Relevant skills:** `branching-and-issues`, `fsd-boundaries`, `testing-and-mocks`, `github-flow-and-release`

```text
You are implementing T01 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/branching-and-issues.md
- docs/skills/fsd-boundaries.md
- docs/skills/testing-and-mocks.md
- docs/skills/github-flow-and-release.md

Goal:
Bootstrap a working Vite + React + TypeScript + Tailwind + React Router + TanStack Query application with Feature-Sliced Design directories and a real test harness.

Requirements:
- Use Vite with React + TypeScript.
- Add Tailwind and base global styles.
- Add React Router with placeholder routes:
  - /
  - /search
  - /favorites
  - /location/:resolvedLocationId
- Add TanStack Query provider in the app shell.
- Create FSD directory structure:
  - src/app
  - src/pages
  - src/widgets
  - src/features
  - src/entities
  - src/shared
- Add placeholder pages/components so the app runs and routes render.
- Add Vitest + React Testing Library setup.
- Add Playwright setup with a placeholder smoke test.
- Add npm scripts for:
  - dev
  - build
  - preview
  - test
  - test:unit
  - test:e2e
  - lint
  - typecheck
- Keep UI minimal; this task is about reliable structure, not product polish.

Testing:
- Add at least one RTL smoke test proving the router renders the expected page content for `/`.
- Add at least one Playwright test proving the app boots and the Home placeholder renders.
- Ensure lint/typecheck/test/build all pass.

Integration / wiring:
- The app must run end-to-end with placeholder screens.
- Do not leave unused experimental files.
- Route placeholders must be visible and navigable so later tasks can build on them.

Definition of done:
- Project boots locally.
- All base scripts work.
- Router + Query provider are wired.
- Test harness is present and green.
- FSD directories exist and are used.
```
