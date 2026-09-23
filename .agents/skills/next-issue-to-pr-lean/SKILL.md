---
name: next-issue-to-pr-lean
description: Use when Ori asks Codex for a lean or lower-token Weatherpane backlog run, or wants a named issue carried through a green pull request with the lean workflow.
---

# Next Issue to PR — Lean

This skill is the Codex entry point for Weatherpane's lean issue-to-PR workflow.

## Delegate to the Canonical Skill

1. Run `git rev-parse --show-toplevel` from the active workspace.
2. Append `/.claude/skills/next-issue-to-pr-lean/SKILL.md` to the returned absolute repository root.
3. Read that canonical skill completely. If the Git-root command fails or the canonical file is missing or unreadable, stop and tell Ori the failed command or resolved absolute path.
4. Follow the canonical skill as the authoritative workflow, including every referenced repository instruction.

Do not reconstruct, summarize, or copy the canonical workflow into this wrapper.

If the canonical portability note says a skill or tool is unavailable but the current Codex session exposes it, treat the verified session capability as authoritative and follow the canonical workflow using that capability.
