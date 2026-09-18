---
name: next-issue-to-pr-lean
description: Use when Ori requests a lean or lower-token Weatherpane backlog run, or wants a named issue carried through a green PR with the lean workflow.
---

# Next Issue to PR — Lean

## When to use this skill

Carry one selected or named issue to an open, reviewed PR with passing CI. This is an alternative to `next-issue-to-pr`, not a wrapper around it. It supersedes that skill's router model and context budget: do not load it, and do not treat its prohibition on reading source or plan files as binding here. Ori reviews at the PR; continue through routine reversible decisions without approval pauses. Do not merge.

## Inputs to inspect first

Resolve `git rev-parse --show-toplevel`; use that root for repository paths. Read the issue and the required agent/area guidance from `AGENTS.md`, including `docs/agents/README.md`, the current agent's workflow, and `docs/skills/branching-and-issues.md`. Read unchanged material once per context. Search owner files and callers with `rg`, then read relevant implementation/tests. Load additional references only for the affected area or an encountered problem; honor mandatory governing instructions.

## Hard rules

- Implement in the main conversation. Use one short plan/continuity note in a temporary directory: acceptance criteria, actions with done-checks, decisions, verification results, remaining work. No separate researcher, planner, per-task briefs, or SDD loop is required by this skill.
- Keep output bounded: command summaries and relevant failure excerpts in context; full logs on disk. Batch independent reads/checks. Reuse passing results for unchanged code; rerun affected checks after changes.
- Preserve unrelated edits, product contracts, Korean artifact/commit language, issue scope, and repository testing requirements. Scope growth becomes a follow-up issue.

## Execution checklist

1. **Select and claim.** For an unnamed issue run `python3 .claude/skills/next-issue-to-pr/scripts/pick_issue.py` from the root. Reuse its priority/age selection and branch prefix; exit 3 means no eligible work, exit 4 means a GitHub blocker. For either a selected or named issue, read `gh issue view <N> --json state,title,body,labels,assignees,milestone,comments`. Check existing PRs/work before claiming. For selected or named issues marked blocked, in-progress, review, QA, or released, resolve the status/ownership first; mutate labels only when existing authorization covers that transition, otherwise ask Ori. Remove superseded workflow labels only as required by that authorized transition. Ready or unlabelled issues need no extra approval. For a run without a PR, record original status labels, then run `gh issue edit <N> --add-label status:in-progress --remove-label status:ready`. When resuming an existing PR, retain its review status and record that no new claim was taken. **Done:** one open issue, acceptance criteria understood, claim owned or authorized PR resumed. Use the harness's required network permissions for `gh` and the picker, which calls `gh` internally.

2. **Isolate and ground.** Run `git fetch origin main`; preserve the current checkout. Before creating a resumed workspace, inspect matching local branches/worktrees and compare their commits with the fetched PR head; reconcile local-only work first, stopping for unclear ownership. Reuse an appropriate isolated feature workspace. Otherwise verify `.worktrees` is ignored: for a new run use `git worktree add <absolute-worktree> -b <type/issue-area-slug> origin/main`; for an existing PR fetch its head and create the worktree from that revision, tracking its source branch. Compare resumed HEAD with `gh pr view <PR> --json headRefOid`; if different, inspect and reconcile the divergence before editing, preserving local commits and stopping for unclear ownership. Use that absolute working directory thereafter. Inspect dependencies and use `pnpm install --frozen-lockfile` when required. Establish the relevant baseline, inspect owner files/callers, and write the short executable plan. **Done:** correct issue branch, baseline known, constraints and acceptance mapped to edits/checks.

3. **Build and verify.** For behavior changes, demonstrate a failing check, implement the smallest fix, and update the matching docs/spec. Run `pnpm lint`, `pnpm typecheck`, and touched-behavior unit/integration tests; changed flows need Playwright smoke, UI changes need screenshots/traces. Docs-only work uses document/skill validation plus lint/typecheck; explain inapplicable behavior checks. Run `git diff --check`. **Done:** acceptance criteria backed by observed results, limitations recorded.

4. **Review and commit.** Self-check the diff, then request one independent whole-change review covering issue/spec alignment and correctness. Give the reviewer the absolute worktree, branch, base SHA, issue/constraint paths, changed files, and evidence location; dispatch it with fresh context where the harness provides one (Claude Code: a single `Agent` call). Reviewer reads source, returns only actionable findings, and writes nothing. Fix substantive findings and re-review the affected delta; investigate repeated failures rather than cycling blindly. If delegation is unavailable, explicitly report a self-review fallback. Verify `git status --short --branch` and commit coherent units on the feature branch. **Done:** no unresolved load-bearing finding; scoped commits, clean worktree.

5. **Open and synchronize.** Read `.github/PULL_REQUEST_TEMPLATE.md`; fill every section in Korean using actual evidence, `Closes #N`, scope/non-scope, spec alignment, risks, rollback, and UI artifacts where applicable. Push the feature branch and create/reuse its PR targeting `main`, using `--body-file`. For a new PR, copy issue assignees, labels, and milestone; transition issue and PR status labels to `status:review`, removing obsolete workflow statuses. For a reused PR, preserve existing issue/PR workflow statuses and metadata; update only what the current task requires. Keep the issue open. **Done:** PR URL, complete body, synchronized metadata.

6. **Observe CI.** Check the PR's latest head SHA and all applicable checks with `gh pr view <PR> --json headRefOid,statusCheckRollup` and `gh pr checks <PR>`. Poll at bounded intervals; store verbose logs and read failed-job excerpts. Fix in-scope failures, review the delta, rerun affected checks, push, and observe checks on the new head. Pending, missing, cancelled, skipped-required, or failing checks are not green. Recheck head SHA before completion. **Done:** latest head matches verified commits and all required checks pass; report issue, branch, PR, tests, and limitations.

## Verification

Completion requires fresh Git/PR evidence for the final revision, a clean issue branch, complete PR metadata, review disposition, local required checks and green CI. Opening a PR alone is not completion. Measure instruction size separately from runtime tokens; claim runtime savings only from comparable observed runs.

## Stop and ask Ori

Stop dependent work for unresolved product/spec conflicts, decisions only Ori can make, prerequisite out-of-scope baseline failures, or authentication/permission/infrastructure blockers. Honor repository stop rules. Preserve work and report stage, branch, commits, PR, failed action, and required decision. Before pre-PR cleanup, re-read issue labels and recent activity. Restore original status labels only if this run introduced the claim and no intervening status/ownership change is evident; otherwise preserve current state and report the conflict. Labels alone are not an ownership lock; after PR creation preserve review status and report the blocker. Verify remote state before retrying an ambiguous mutation. Never bypass a failed gate to meet a token budget.

## Portability note

This file is the single source of truth; `.agents/skills/next-issue-to-pr-lean/` only resolves and delegates to it. Claude Code: `Bash`, `Grep`, `Read`, and `Agent`. Codex: shell `git`/`gh`/`pnpm`, `rg`/file reads, and available agent tools. Choose capabilities from the current harness; neither runtime requires loading the original skill or SDD for this workflow.
