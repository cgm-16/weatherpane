---
name: next-issue-to-pr
description: Use when Ori asks Codex to select the next Weatherpane GitHub issue, work the backlog, ship the next task, or carry a named issue through an open and green pull request.
---

# Next Issue to PR

This skill is the Codex entry point for Weatherpane's canonical issue-to-PR workflow.

## Delegate to the Canonical Skill

1. Run `git rev-parse --show-toplevel` from the active workspace.
2. Append `/.claude/skills/next-issue-to-pr/SKILL.md` to the returned absolute repository root.
3. Read that canonical skill completely. If the Git-root command fails or the canonical file is missing or unreadable, stop and tell Ori the failed command or resolved absolute path.
4. Follow the canonical skill as the authoritative workflow, including every required sub-skill and referenced repository instruction.

Do not reconstruct, summarize, or copy the canonical workflow into this wrapper.

If the canonical portability note says a skill or tool is unavailable but the current Codex session exposes it, treat the verified session capability as authoritative and follow the canonical workflow using that capability.
