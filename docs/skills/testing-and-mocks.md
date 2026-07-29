# Testing And Mocks

## When to use this skill

- Any task that changes behavior, data flow, or user-visible state
- Any task that touches test coverage, demo mode, or CI expectations
- Any task where verification could be skipped because the repo scripts are uneven

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/specs.md](../specs.md)
- [docs/specs-favorites.md](../specs-favorites.md) when favorites behavior is involved
- [package.json](../../package.json)
- the nearest test files under `tests/` and feature-local test files

## Hard rules

- Use mocked API responses by default in tests.
- Local demo mode may use a mock provider.
- Production must not silently fall back to demo data.
- Unit and component tests use Vitest and RTL.
- End-to-end smoke tests use Playwright.
- Every `tests/*.e2e.ts` file must import `test`/`expect` from `tests/fixtures.ts`, never directly from `@playwright/test`. The shared fixture fails any test where the page emits a hydration-related console error/warning or `pageerror` (matched by `/hydrat/i`), so SSR/client mismatches fail CI instead of only appearing in dev server stdout. This is mechanically enforced by an ESLint `no-restricted-imports` rule scoped to `tests/**/*.e2e.ts`; `tests/fixtures.ts` itself is the one legitimate place to import `test`/`expect` from `@playwright/test`.
- The guard can be waived for a pre-existing, already-tracked hydration bug via `test.use({ knownHydrationBug: '#<issue>' })`, scoped to the narrowest `test`/`test.describe` block that actually reproduces the bug (never to a whole file or describe block that also holds unaffected passing tests). Hydration mismatches are environment-dependent (a bug that reproduces locally may not reproduce in CI, and vice versa), so the waiver does not fail the test when no issue is detected during a given run — that would turn a nondeterministic condition into a hard failure. Instead the waiver is self-documenting but not self-enforcing: when the bug is detected, it logs `[knownHydrationBug #<issue>] ...`; when it is not detected, it logs a `[STALE_HYDRATION_WAIVER]`-prefixed warning and still passes. Treat that warning as a prompt to manually verify the issue is fixed before deleting the waiver, not as proof it is. Do not add a waiver for a bug you are introducing — fix it instead.
- Before proposing completion, run lint, typecheck, unit or integration checks for touched behavior, and Playwright smoke when the flow changed.
- Attach screenshots or traces for UI changes.

## Execution checklist

1. Intent: decide the minimum verification surface before changing code.
   Action:
   - inspect the touched files and specs
   - classify the change as one of:
     - docs or process only
     - non-UI logic
     - UI component or screen behavior
     - user flow change
       Done-check: the required verification commands are named before implementation starts.

2. Intent: add or update the smallest relevant automated test for behavior changes.
   Action:
   - use `pnpm exec vitest run path/to/changed.test.ts` for unit or integration coverage
   - use `pnpm exec playwright test path/to/changed-flow.spec.ts` for flow-level smoke when the user journey changed
     Done-check: the test target maps directly to the changed behavior, not a broad unrelated suite.

3. Intent: preserve the mock boundary.
   Action:
   - use mocked API responses in tests by default
   - keep demo data behind explicit mock or demo configuration
   - refuse silent production fallback paths
     Done-check: test fixtures and demo mode do not leak into production behavior.

4. Intent: run the repository's completion checks honestly.
   Action:
   - run the available repository checks from the implementation worktree
   - use `pnpm typecheck`
   - run the targeted Vitest and Playwright commands that match the touched behavior
   - if `lint` or another expected script does not exist, report that exact gap instead of claiming it passed
     Done-check: every claimed check has fresh command output behind it.

5. Intent: capture UI evidence when the task affects rendered behavior.
   Action:
   - save screenshots or traces for UI changes
   - mention the command and artifact in the final verification note or PR
     Done-check: UI changes are backed by a visible artifact, not just prose.

## Verification

- `pnpm typecheck`
- `pnpm exec vitest run path/to/changed.test.ts` for touched logic or component behavior
- `pnpm exec playwright test path/to/changed-flow.spec.ts` when a user flow changed
- screenshots or traces for UI changes

Required smoke coverage when these flows are touched:

- current-location success and fallback
- search -> detail -> active location
- favorites add, remove, reorder, and persistence
- theme persistence
- recents persistence

## Stop and ask Ori

- the spec is ambiguous about expected behavior, so a test would lock in a guess
- the baseline test fails and the root cause is not yet understood
- production fallback behavior would need to change to make tests pass
- a required verification command is missing and adding it would expand scope beyond the task

## Portability note

Codex: run `pnpm`, `vitest`, and `playwright` commands directly in the shell.
Claude Code: run the same commands via the `Bash` tool. Apply `superpowers:verification-before-completion` skill before claiming any check passed. Apply `superpowers:test-driven-development` skill before writing implementation code.
