# FSD Boundaries

## When to use this skill

- Any task that creates, moves, or imports files across feature or layer boundaries
- Any task that introduces shared utilities or domain entities
- Any time you are unsure where a new file belongs in the Feature-Sliced Design hierarchy

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- The current folder layout under `app/` (use `Glob` tool or `ls` to inspect)
- The files you are about to modify or create

## Hard rules

- Respect Feature-Sliced Design layer boundaries: app → pages/widgets → features → entities → shared
- No ad hoc cross-imports between sibling features
- Shared primitives (API clients, storage adapters, UI atoms, utilities, config) go under `shared/`
- Domain entities (location, weather, AQI, asset selection) go under `entities/`
- User actions and interaction logic (search, favorites, theme, refresh) go under `features/`
- UI composition lives in `widgets/` and `pages/`, not in `shared/` or `entities/`
- Business and domain logic must not leak into presentational shells
- Provider response shapes must not leak directly into UI components

## Execution checklist

1. Intent: classify where the new or changed file belongs before creating it.
   Action:
   - identify whether the code is: a primitive/utility (shared), a domain model (entities), an interaction feature (features), screen composition (pages/widgets), or bootstrap/routing (app)
   - if uncertain, read the folder that currently owns similar code before deciding
   Done-check: the target layer is named and justified before the file is created or moved.

2. Intent: verify that new imports do not violate layer boundaries.
   Action:
   - confirm the import direction follows app → pages/widgets → features → entities → shared
   - search for any sibling-feature cross-imports in the changed files
   Done-check: no import in the changed code points from a lower layer up to a higher layer, or sideways between sibling features.

3. Intent: confirm shared code does not contain domain or interaction logic.
   Action:
   - read the file you are placing in `shared/` and confirm it has no feature-specific state, routing logic, or product rules
   Done-check: the file in `shared/` could be moved to any other project without modification.

## Verification

- Search for cross-layer imports in touched files
- Confirm no feature imports another sibling feature directly
- Confirm no provider response type appears in a UI component prop

## Stop and ask Ori

- The correct layer for a new abstraction is genuinely ambiguous after reading the surrounding code
- An existing file in the wrong layer would need to move to satisfy the rule, but moving it is out of scope for the current task

## Portability note

Codex: use `rg` to search for import patterns.
Claude Code: use the `Grep` tool with the same patterns. The layer rules are identical for both agents.
