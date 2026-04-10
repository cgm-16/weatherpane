# Skill Authoring Contract

Use this file when creating or rewriting files in [docs/skills](../skills/README.md).

## Goal

Each skill file should help Codex execute real work in Weatherpane without having to infer the repository workflow from scattered rules.

## What a skill file must do

- state when the skill applies
- name the inputs to inspect before acting
- restate only the area rules that must not drift
- convert those rules into an execution checklist
- define how to verify the work
- define when to stop and ask Ori instead of guessing
- add a short portability note for non-Codex agents

## Required structure

Every skill file should use this section order:

1. `# <Skill name>`
2. `## When to use this skill`
3. `## Inputs to inspect first`
4. `## Hard rules`
5. `## Execution checklist`
6. `## Verification`
7. `## Stop and ask Ori`
8. `## Portability note`

## Execution checklist format

Each checklist item must include:
- intent
- exact command or concrete action
- done-check

Use short bullets. If the action is command-based, show the command exactly. If the action is file-reading or reasoning work, name the file or decision explicitly.

## Writing rules

- Write for Codex first.
- Keep skill docs in English.
- Use repository terms exactly as they appear in specs and AGENTS.
- Prefer stable commands already used in this repo.
- If a command is conditional, state the condition instead of listing every possible variant.
- If verification depends on repo state, say how to report the gap instead of implying success.

## Do not do these things

- Do not write policy-only bullet lists with no execution path.
- Do not duplicate all of [AGENTS.md](../../AGENTS.md).
- Do not invent new product rules to make the playbook feel complete.
- Do not use vague phrases such as "make sure it works" or "follow best practices."
- Do not hide stop conditions. If a decision needs Ori, say so directly.

## Minimal template

```md
# <Skill name>

## When to use this skill
- Trigger 1
- Trigger 2

## Inputs to inspect first
- File or command
- File or command

## Hard rules
- Rule that must not drift

## Execution checklist
1. Intent: ...
   Action: `...`
   Done-check: ...

## Verification
- `...`
- Expected evidence: ...

## Stop and ask Ori
- Ambiguity or blocker

## Portability note
- Short note for non-Codex agents
```

## Portability note

This contract is Codex-first. Other agents can reuse it, but they should swap command or tool language instead of changing the section structure.
