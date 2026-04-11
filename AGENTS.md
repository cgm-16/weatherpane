# AGENTS.md

## Project identity

Weatherpane is a React + TypeScript + Tailwind weather app for South Korea.
Architecture is Feature-Sliced Design.
Server state uses TanStack Query.
Persistent app state uses explicit storage models.
Do not treat TanStack Query cache as long-term persistence.

## Workflow rules

- Follow GitLab Flow semantics on GitHub.
- Branch from `main`.
- Use `type/issue-area-slug`.
- One issue per primary branch.
- No direct commits to `main` or `release/*`.
- No silent scope expansion.
- If scope changes, open a follow-up issue.

## Required reading before changes

Before planning or executing non-trivial changes, read:

- `docs/agents/README.md`
- the workflow doc for your agent type (see `docs/agents/README.md` for which one)
- the nearest relevant skill files in `docs/skills/`

If the task changes agent guidance or skill docs, also read `docs/agents/skill-authoring-contract.md`.

Minimum required skills by area:

- search work -> `docs/skills/search-and-location-resolution.md`
- favorites work -> `docs/skills/favorites-behavior.md`
- weather/query work -> `docs/skills/weather-domain-contracts.md`
- asset work -> `docs/skills/asset-manifest-contract.md`
- testing/CI work -> `docs/skills/testing-and-mocks.md`
- workflow/release work -> `docs/skills/github-flow-and-release.md`
- design/theming work -> `docs/skills/design-tokens.md`

## Architecture rules

- Respect FSD boundaries.
- Avoid deep cross-feature imports.
- Shared primitives belong in `shared/`.
- Business/domain logic belongs in entities/features, not presentational shells.
- Prefer normalized app-facing models over leaking provider response shapes into UI.

## Product rules that must not drift

- Search is Korea-catalog-driven and instant.
- Search query is URL-backed on `/search?q=...`.
- Unsupported locations do not replace active location.
- Favorites max is 6.
- Favorites order is manual and persisted.
- Reorder + nickname edit live only in 편집/정렬 mode.
- Nickname max length is 20 and hard-capped.
- Undo restores exact previous favorite state.
- Only the latest removal is undoable.
- Card state behavior must follow the spec exactly.

## Query and persistence rules

- Main weather staleTime: 10m
- AQI staleTime: 30m
- Retry once
- Refetch on focus only when stale
- Do not persist TanStack Query cache across sessions
- Weather snapshot fallback cutoff: 24h
- AQI snapshot fallback cutoff: 12h

## Testing rules

Before proposing completion:

- run lint
- run typecheck
- run unit/integration tests for touched behavior
- run Playwright smoke when the flow changed
- attach screenshots/traces for UI changes

Use mocks by default in tests and local demo mode.
Production must show explicit config/service errors, not silent demo fallback.

## PR rules

Every PR must:

- link an issue
- describe scope and non-scope
- state spec alignment
- mention tests run
- include screenshots for UI changes
- call out risks and rollback notes

## Agent output rules

When changing behavior:

- update the relevant docs/skill/spec file in the same PR

When uncertain:

- do not invent new behavior
- preserve the agreed spec
- raise the gap explicitly in the issue/PR notes

## Documentation Guidelines

- Skill files (`SKILL.md`), `docs/skills/*`, and prompt plan files are instructions optimized for Codex - write them in English for clarity
- All other written artifacts must be in Korean: PR titles/descriptions, commit messages, code comments, documentation files, and issue descriptions
- Exceptions: `AGENTS.md`, `docs/agents/*`, and `docs/skills/*` must be written in English. Files under `docs/legacy/*` may remain in their original language.
- All TypeScript/JavaScript source files follow the Korean comment rule, including build scripts under `scripts/`.
- `docs/` and its subfolders (except `docs/legacy/`) MUST be kept current with the codebase; do not leave outdated content after related changes.
- `docs/legacy/` contains archived historical documents that may be outdated by design.
- `docs/agents/` contains prompt plans and LLM-facing operational documents, and these files should be written in English.
- Archive to `docs/legacy/` only when superseded or no longer operational, while preserving original filenames and relative topic grouping.
- Every `docs/legacy/` document MUST include YAML front matter keys `archived_on`, `archive_reason`, and `replaced_by`; allowed `archive_reason` values are `superseded`, `no_longer_operational`, `historical_reference`.
- `replaced_by` is required when `archive_reason: superseded`, and optional otherwise.
- Use `$docs-governance` for docs update/archive procedure and verification checks.
