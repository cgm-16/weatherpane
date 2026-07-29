---
name: next-issue-to-pr
description: Pick the next GitHub issue off the board — highest priority tier, oldest within that tier — and carry it all the way to an open PR using superpowers subagent-driven development. Use this skill whenever Ori asks what to work on next, says "take the next issue", "work the backlog", "grab the top-priority issue", "pick something off the board", "ship the next thing", or asks for an issue to be implemented end-to-end without naming which one. Also use it when Ori names a specific issue number and wants it implemented through to a PR, since stages 2-5 apply unchanged once selection is skipped.
---

# Next Issue To PR

Carry one issue from the board to an open PR, autonomously, in five stages:

```
1 SELECT    pick the issue, claim it with status:in-progress
2 ISOLATE   worktree + branch off origin/main
3 PLAN      read the issue, write the plan file inside the worktree
4 BUILD     superpowers:subagent-driven-development over the plan
5 SHIP      push -> PR, template filled, issue metadata synced
```

Ori reviews at the PR, not before it. Run all five stages without checking in.
Progress summaries and "should I continue?" prompts cost Ori time they chose not
to spend — the PR is the checkpoint. The narrow list of genuine hard stops is at
the end of this file; everything not on it, decide yourself and record the
decision in the PR body.

## When to use this skill

- Ori asks for the next/top/oldest issue to be worked, without naming one
- Ori names an issue and wants it implemented through to a PR (skip stage 1)
- Any request to "work the backlog" or "ship the next thing"

## Inputs to inspect first

- [AGENTS.md](../../../AGENTS.md) — product rules that must not drift
- [docs/skills/branching-and-issues.md](../../../docs/skills/branching-and-issues.md) — branch naming, commit language, PR requirements
- [docs/skills/task-to-pr-automation.md](../../../docs/skills/task-to-pr-automation.md) — the end-to-end workflow this skill automates
- [docs/skills/README.md](../../../docs/skills/README.md) — to find the area skill for the issue's `area:*` label
- `.github/PULL_REQUEST_TEMPLATE.md` — every section must be filled for real

Read the area skill matching the issue's `area:*` label before planning. AGENTS.md
lists the minimum required skill per area; an implementation that ignores its area
skill will fail review on rules this skill does not restate.

## Hard rules

- Never commit to `main` or `release/*`, and never check out `main` to branch from it
- One issue per branch; branch name is `type/issue-area-slug`
- Korean for PR title/body, commit messages, code comments, and `docs/` files;
  English for `AGENTS.md`, `docs/agents/*`, `docs/skills/*`, and skill files
- Never edit implementation files yourself once stage 4 starts — every code change
  goes through an implementer subagent and its reviewers. Controller edits skip
  review and pollute the context that coordinates the run
- Every subagent prompt states the branch the agent must be on and tells it to
  verify with `git status --short --branch` before its first commit. Subagents
  have committed to the wrong branch when this was left implicit
- Run binaries with `pnpm exec <tool>`, never `npx` or `pnpx`
- Scope growth opens a follow-up issue; it never silently expands this PR
- Verification claims need fresh command output. "Should pass" is not evidence

## Execution checklist

### 1. Select and claim the issue

Intent: pick deterministically and make the pick visible on the board.

```bash
python3 .claude/skills/next-issue-to-pr/scripts/pick_issue.py
```

The script sorts by priority tier (`priority:p0` first), then by creation time
ascending within the tier, skipping anything labelled `status:blocked`,
`status:in-progress`, or `status:review`. It prints the winner, the runners-up,
what it skipped and why, and a `branch_prefix`. Exit code 3 means nothing is
eligible — say so and stop; there is no work to do.

Then claim it, so a later run of this skill does not pick the same issue again:

```bash
gh issue edit <N> --add-label status:in-progress --remove-label status:ready
gh issue view <N> --json title,body,labels,assignees,milestone,comments
```

`--remove-label` on a label the issue does not carry is a no-op that exits 0, so the
claim works on any issue regardless of which `status:*` label it started with.

The claim is what makes the skip rule self-enforcing. Without it this skill
re-selects the same issue every run. If you abort before opening the PR, remove
the label again — a stale `status:in-progress` starves the issue silently.

Done-check: one issue number, its full body read, `status:in-progress` applied,
and a one-line statement of why it beat the field (the script's `reason`).

### 2. Isolate the work

Intent: get an isolated worktree on a correctly named branch without touching `main`.

```bash
git fetch origin main
git worktree add .worktrees/<slug> -b <type/issue-area-slug> origin/main
```

Branching from the fetched `origin/main` ref means `main` is never checked out and
the current working tree — which may be dirty, on another branch — is untouched.
Build the branch name from the script's `branch_prefix`, replacing `<slug>` with a
few words describing the change. `.worktrees/` is already git-ignored.

Isolation comes before planning because the plan file lives inside the worktree
(stage 3 writes it to `docs/superpowers/plans/`). Do the rest of the run in there.
Install dependencies only if the task needs package commands and `node_modules` is
missing.

Establish the baseline before any edit: run the checks the task's surface depends
on. A check that already fails is either in scope or a blocker — decide which, and
say which in the PR body. Discovering a pre-existing failure after implementation
makes it impossible to tell what your change broke.

Done-check: worktree on the right branch, clean status, baseline known.

### 3. Turn the issue into a plan file

Intent: SDD is parameterized on a plan file, so one must exist before stage 4.

Read the issue body and the area skill, then judge how specified the issue is:

- **Concrete and bounded** — the issue names the defect or the change, and you can
  see the files it touches. Write the plan directly with `superpowers:writing-plans`.
- **A feature with real design questions** — several defensible shapes, and picking
  wrong wastes the whole run. Use `superpowers:brainstorming` first, then write the
  plan. Brainstorming is a thinking step, not an interrupt; do not stop for Ori
  unless the ambiguity is one only Ori can resolve (see the stop list).
- **Too vague to plan at all** — the issue states a symptom with no reproduction and
  no acceptance criteria. Investigate first with `superpowers:systematic-debugging`
  and write the plan around what you find. An issue you cannot plan after
  investigating is a stop.

The plan's Global Constraints section must carry the product rules from AGENTS.md
and the area skill that bind this work — exact values, exact formats. Task
reviewers in stage 4 use that section as their attention lens, so a rule missing
there is a rule nobody checks.

Write the plan to `docs/superpowers/plans/<date>-<slug>.local.md`. The `.local.md`
suffix matters: `*.local.*` is git-ignored, which keeps the plan out of the PR diff
and out of the `docs/` Korean-language rule, so the plan can be written in English
for the subagents that consume it. A plan committed into the branch turns a
one-file fix into a review with tens of thousands of characters of scaffolding in
the diff — the reviewer's attention is the scarce resource the PR is competing for.

Done-check: a plan file exists at that path with numbered tasks, each independently
implementable, and Global Constraints quoting the binding rules verbatim.

### 4. Build it with subagent-driven development

Intent: implement through subagents, with a review gate per task.

Invoke `superpowers:subagent-driven-development` with the plan file and follow it.
Let the harness resolve the skill's scripts — several plugin versions are cached, so
hardcoded script paths rot. That skill owns the loop: ledger, per-task implementer,
per-task review, the fix loop and its cap, and the final whole-branch review.

**When a review finding collides with the plan, ask who wrote the constraint.**
SDD treats plan conflicts as the human's call, but most of the plan is text *you*
wrote minutes earlier — escalating your own draft to Ori is noise. Split it:

- The constraint came from **your plan** → amend the plan, record why in the ledger,
  and dispatch the fix. A plan constraint that review proves wrong is just a bug in
  the plan.
- The constraint came from **the issue, AGENTS.md, or a product rule** → that is
  Ori's, and it is a stop even mid-run.

**Anything whose job is to detect a fault must be observed failing.** A regression
test that never failed, a lint rule never seen to fire, a CI guard nobody watched
trip — none are known to work; they are only known to be green, which is the exact
condition that let the bug ship in the first place. So when you dispatch a fix for
this class of work, name the *falsifying condition* rather than describing the
problem: "this test must fail when `getServerSnapshot` is reverted to X." Without a
stated discriminator, implementers satisfy one property by trading away another —
and the trade is invisible in a green suite.

**When a subagent dies mid-task** (session limit, crash), do not re-dispatch blind.
Its uncommitted work is usually intact and worth keeping. First verify integrity:
`git status`, and specifically confirm that any file it reverted *temporarily* for
testing was restored — an implementer killed between "revert to prove the guard
fires" and "restore" leaves the bug reinstated in the worktree. Then resume the same
agent with what remains; its context survives.

What this repo adds on top of it:

- Every dispatch names the branch and requires `git status --short --branch` before
  the first commit
- Implementers write commit messages in Korean, Conventional Commits format
- Implementers run `pnpm lint`, `pnpm typecheck`, and the tests covering their
  change; UI changes also need Playwright smoke and a screenshot, with the artifact
  path in the report
- The task reviewer's global-constraints block quotes the area skill's rules and the
  AGENTS.md product rules the task touches
- Behavior changes update the matching doc/skill/spec file in the same PR

Done-check: ledger shows every task complete, final whole-branch review clean or its
residual findings parked with written rulings.

### 5. Ship it

Intent: land a PR that a reviewer can act on without asking questions.

Do not use `superpowers:finishing-a-development-branch` here. That skill's job is to
present merge/PR/cleanup options and let a human choose — which is exactly the
interrupt this pipeline is meant not to raise. The destination is already decided,
so run it directly:

```bash
git push -u origin <branch>
# If the push fails with "could not read Username" the osxkeychain helper is locked.
# Route this one command through gh's token instead of writing config to the machine:
#   git -c credential.helper='!gh auth git-credential' push -u origin <branch>
gh pr create --title "<Korean conventional-commit title>" --body-file <file>
gh issue view <N> --json assignees,labels,milestone
gh pr edit <PR> --add-assignee ... --add-label ... --milestone ...
gh issue edit <N> --add-label status:review --remove-label status:in-progress
```

The PR body follows `.github/PULL_REQUEST_TEMPLATE.md` with every section filled
from what actually happened: `Closes #N`, in-scope and out-of-scope work, spec
alignment, the verification commands you ran and their results, screenshots for UI
changes, risks, and rollback notes. Unticked boxes and leftover placeholders are
what turn one review into three.

Carry the issue's assignees, labels, and milestone onto the PR. Leave the issue
open — the PR closes it on merge.

**The run is not finished when the PR opens — it finishes when CI passes.** Watch it:

```bash
gh run watch <run-id> --exit-status
```

A suite that is green on your machine is evidence about your machine. CI runs on
different hardware, headless, with different timing, and any behaviour that depends
on those — hydration mismatches, races, animation, anything timing-sensitive —
can appear or vanish there. This is not hypothetical: a run of this skill opened a
PR after 34/34 passed locally, and CI failed three tests immediately, because a
check had been built to *require* a nondeterministic condition that simply did not
occur on the runner.

Two rules follow. First, never report a PR as done on local output alone. Second, a
mechanism that asserts a fault *must* occur will fail wherever that fault is
environment-dependent — so suppression mechanisms warn, and only the detection path
fails. Retries do not save you: they rescue a test that passes on retry, not one
that fails identically three times.

A third rule, if you ever suppress a known failure to get a suite green: **key the
suppression to the specific fault, not to its location.** "Ignore hydration errors
in this file" also ignores the next, unrelated one that lands there — the
suppression silently widens into a blind spot. "Ignore the hydration error whose
diff contains `data-theme-toggle`" does not. The signature you need is usually
already in the error text you are discarding for readability, so match on the full
message and truncate only for display.

Automated PR reviewers are worth reading, but verify each claim against the code as
it is now — they review a snapshot and will confidently ask you to restore something
you deliberately removed two commits ago. Apply what is still true, skip the rest
with a stated reason.

If CI fails, fix it before reporting. The PR is yours until it is green.

Done-check: a PR URL, no placeholders in the body, metadata matching the issue,
`status:review` on the issue, and CI observed passing.

## Verification

Before claiming the run is done, confirm each of these from real output:

- `git status --short --branch` — on the feature branch, clean tree
- `git log --oneline origin/main..HEAD` — commits present, Korean messages
- `pnpm lint`, `pnpm typecheck`, and the tests for the touched surface — passing
- `gh pr view <PR> --json url,body,labels,assignees,milestone` — body complete,
  metadata matches the issue
- `gh issue view <N> --json labels` — carries `status:review`

Expected evidence: one issue number, one branch, one PR URL, fresh passing check
output, and PR metadata equal to the issue's. Report any check you could not run as
a gap in the PR body rather than implying it passed.

To verify changes to the picker itself:

```bash
python3 .claude/skills/next-issue-to-pr/tests/test_pick_issue.py
```

## Stop and ask Ori

Stop only when proceeding would be unsafe or would make the work useless if the
guess is wrong. Everything else, decide and record. Genuine stops:

- The issue is still unplannable after investigation, or its acceptance criteria
  contradict AGENTS.md product rules
- The work needs a product decision only Ori can make — a spec change, a
  user-visible behavior tradeoff, a dependency addition
- The plan requires touching `main`, `release/*`, secrets, or CI credentials
- The baseline is broken in a way that is plainly outside the issue, and fixing it
  is a prerequisite
- SDD reports BLOCKED at its fix-loop cap on a load-bearing finding
- Both `gh pr create` and connector PR creation fail

When you stop, remove `status:in-progress` from the issue, say exactly which stage
you reached, what exists on disk and on the remote, and what you need.

## Portability note

- Claude Code: commands above run via `Bash`; `Read`/`Grep` for file inspection;
  `Skill` to invoke `superpowers:*`; `Agent` for subagent dispatch.
- Codex: same shell commands directly. Codex has no `superpowers:*` skills — follow
  [docs/skills/task-to-pr-automation.md](../../../docs/skills/task-to-pr-automation.md)
  for stages 2-5 and implement stage 4 single-threaded, keeping the per-task review
  gate as a self-review pass against the plan's Global Constraints.
