# Agent Docs

This directory is the agent-facing execution layer for Weatherpane.

Use the documents here to translate repository rules and product specs into a repeatable working process. These files do not replace [AGENTS.md](../../AGENTS.md) or the area playbooks in [docs/skills](../skills/README.md). They define how agents should use them.

## Document split

- [AGENTS.md](../../AGENTS.md): repository rules, product invariants, workflow constraints, documentation rules
- [docs/agents/codex-workflow.md](./codex-workflow.md): default execution loop for Codex
- [docs/agents/claude-code-workflow.md](./claude-code-workflow.md): default execution loop for Claude Code
- [docs/agents/skill-authoring-contract.md](./skill-authoring-contract.md): format and quality bar for agent-oriented skill docs
- [docs/skills/*](../skills/README.md): area-specific execution playbooks

## Required reading order

1. Read [AGENTS.md](../../AGENTS.md).
2. Read the workflow doc for your agent type:
   - Codex → [docs/agents/codex-workflow.md](./codex-workflow.md)
   - Claude Code → [docs/agents/claude-code-workflow.md](./claude-code-workflow.md)
3. Read the nearest relevant files in [docs/skills](../skills/README.md).
4. If the task changes agent guidance or skill docs, also read [docs/agents/skill-authoring-contract.md](./skill-authoring-contract.md).

## Operating rule

Agent docs must interpret existing repository rules and product specs. They must not invent new product behavior, persistence rules, or workflow shortcuts.

## Portability note

Codex-specific commands live in codex-workflow.md. Claude Code-specific tool and skill references live in claude-code-workflow.md. Skill files in docs/skills/ serve both agents.
