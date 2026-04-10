# Agent Docs

This directory is the Codex-facing execution layer for Weatherpane.

Use the documents here to translate repository rules and product specs into a repeatable working process. These files do not replace [AGENTS.md](../../AGENTS.md) or the area playbooks in [docs/skills](../skills/README.md). They define how Codex should use them.

## Document split

- [AGENTS.md](../../AGENTS.md): repository rules, product invariants, workflow constraints, documentation rules
- [docs/agents/codex-workflow.md](./codex-workflow.md): default execution loop for non-trivial work in this repo
- [docs/agents/skill-authoring-contract.md](./skill-authoring-contract.md): format and quality bar for Codex-oriented skill docs
- [docs/skills/*](../skills/README.md): area-specific execution playbooks

## Required reading order

1. Read [AGENTS.md](../../AGENTS.md).
2. Read [docs/agents/codex-workflow.md](./codex-workflow.md).
3. Read the nearest relevant files in [docs/skills](../skills/README.md).
4. If the task changes agent guidance or skill docs, also read [docs/agents/skill-authoring-contract.md](./skill-authoring-contract.md).

## Operating rule

Agent docs must interpret existing repository rules and product specs. They must not invent new product behavior, persistence rules, or workflow shortcuts.

## Portability note

These documents are written for Codex first. Other agents may reuse the same structure, but command examples and workflow language assume Codex running in this repository.
