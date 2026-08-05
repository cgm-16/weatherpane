# Codex `next-issue-to-pr` Wrapper Design

## Goal

Make `$next-issue-to-pr` directly invokable by Codex inside the Weatherpane repository. Keep `.claude/skills/next-issue-to-pr` as the workflow's single source of truth. The Codex skill only discovers and delegates to that canonical skill.

## Scope

In scope:

- `AGENTS.md` agent-delegation guidance
- `.agents/skills/next-issue-to-pr/SKILL.md`
- `.agents/skills/next-issue-to-pr/agents/openai.yaml`
- structural validation and fresh-context delegation evaluation

Out of scope:

- changing the canonical Claude skill or its supporting files
- copying scripts, tests, evaluations, workflow stages, handoff rules, or context-budget guidance
- changing issue selection or the canonical workflow's implementation, review, or PR policy
- changing application code or user-facing UI

## Agent Delegation Alignment

The main conversation coordinates work and retains decisions requiring full context. Implementation and review follow the applicable skill's delegation model, including `superpowers:subagent-driven-development` and task-specific workflows. Tightly coupled iterative implementation stays in the main conversation only when no applicable workflow requires delegation.

This project-level rule reconciles the generic main-conversation default with Weatherpane's skill-driven execution methods without changing the canonical `next-issue-to-pr` workflow.

## Canonical Workflow Boundary

The canonical skill owns its controller model, workflow stages, scratch artifacts, subagent roles, dispatch limits, and context targets. The wrapper must not name or summarize those details. Resolving the canonical skill at invocation time lets the wrapper inherit workflow changes without creating a second copy that can drift.

## Structure

```text
AGENTS.md
.agents/skills/next-issue-to-pr/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`SKILL.md` is the Codex discovery and execution entry point. `agents/openai.yaml` contains only the display name, short description, and default invocation prompt. The wrapper adds no `scripts/`, `references/`, or `assets/`.

## Delegation Flow

1. Codex loads the wrapper through explicit `$next-issue-to-pr` invocation or description-based matching.
2. The wrapper resolves the active repository root with `git rev-parse --show-toplevel`.
3. It reads `<repository-root>/.claude/skills/next-issue-to-pr/SKILL.md` completely.
4. It loads the canonical skill's required repository guidance and applicable runtime skills.
5. It executes the canonical workflow as the authoritative procedure.

The wrapper does not restate the canonical workflow. When the canonical portability note conflicts with tools or skills verified in the current Codex session, the verified runtime capabilities take precedence. This exception changes no workflow rule; it prevents stale capability descriptions from disabling available Codex functionality.

## Error Handling

- If the Git repository root cannot be resolved, stop and tell Ori the current path and failed command.
- If the canonical skill is missing or unreadable, stop and report its resolved absolute path.
- Do not reconstruct the canonical workflow from memory or wrapper text.

## Validation

RED records that a fresh Codex context without the wrapper cannot discover `$next-issue-to-pr` or delegate to the canonical skill.

GREEN verifies:

- `quick_validate.py` accepts the skill directory.
- YAML contains only required frontmatter and approved UI metadata.
- A fresh context resolves the canonical skill from the active repository and reads it completely.
- Delegation works with the canonical skill tracked by the synchronized repository.
- The wrapper contains no canonical stage, handoff, or context-budget instructions.

## Completion Criteria

- The issue #101 branch adds this design record and wrapper files and updates `AGENTS.md`.
- Fresh command and evaluation output supports every validation claim.
- The PR states non-scope, test evidence, risks, and rollback steps.
