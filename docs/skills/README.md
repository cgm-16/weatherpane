# Agent Skills Index

Use these files as Weatherpane's area-specific execution playbooks.

Read [docs/agents/codex-workflow.md](../agents/codex-workflow.md) first, then read the skill files that match the task surface.

## Core skills

- [branching-and-issues.md](./branching-and-issues.md)
- [fsd-boundaries.md](./fsd-boundaries.md)
- [weather-domain-contracts.md](./weather-domain-contracts.md)
- [search-and-location-resolution.md](./search-and-location-resolution.md)
- [favorites-behavior.md](./favorites-behavior.md)
- [asset-manifest-contract.md](./asset-manifest-contract.md)
- [testing-and-mocks.md](./testing-and-mocks.md)
- [github-flow-and-release.md](./github-flow-and-release.md)

## Usage rule

If a task touches an area, the corresponding skill file must be read before changes are proposed or implemented.

## Scope rule

Skills in this directory should stay focused on area-specific contracts and execution steps. Repository-wide workflow belongs in [docs/agents](../agents/README.md) and [AGENTS.md](../../AGENTS.md).
