---
name: next-issue-to-pr
description: Pick the next GitHub issue off the board — highest priority tier, oldest within that tier — and carry it all the way to an open PR using superpowers subagent-driven development. Use this skill whenever Ori asks what to work on next, says "take the next issue", "work the backlog", "grab the top-priority issue", "pick something off the board", "ship the next thing", or asks for an issue to be implemented end-to-end without naming which one. Also use it when Ori names a specific issue number and wants it implemented through to a PR, since stages 2 onward apply unchanged once selection is skipped.
---

# Next Issue To PR

Carry one issue from the board to an open PR, autonomously:

```
1 SELECT    pick the issue, claim it with status:in-progress
2 ISOLATE   worktree + branch off origin/main
2.5 GROUND  a researcher subagent writes ground-truth.md; you get the path
3 PLAN      a planner subagent writes the plan + per-task briefs; you get the paths
4 BUILD     superpowers:subagent-driven-development over the plan
5 SHIP      push -> PR, template filled, issue metadata synced
```

Ori reviews at the PR, not before it. Run every stage without checking in.
Progress summaries and "should I continue?" prompts cost Ori time they chose not
to spend — the PR is the checkpoint. The narrow list of genuine hard stops is at
the end of this file; everything not on it, decide yourself and record the
decision in the PR body.

**You are a router, not a reader.** Stage 4 costs one full re-send of your entire
context per turn, and it runs for 80-200 turns. Every file you read in stages 1-3
is therefore paid 80-200 times over. Measured: a docs-only three-task PR entered
stage 4 carrying 202k tokens and spent 17.7M of its 34.4M input budget doing
nothing but re-sending that floor. Facts reach you as file paths written by
subagents; you pass those paths on without opening them. See
[Context budget](#context-budget) for the target and how to check it.

## When to use this skill

- Ori asks for the next/top/oldest issue to be worked, without naming one
- Ori names an issue and wants it implemented through to a PR (skip stage 1)
- Any request to "work the backlog" or "ship the next thing"

## Inputs to inspect first

You read only what governs _your own_ actions — routing, branch naming, PR
mechanics. Everything that governs the _code_ is read by the subagents that write
it.

- [docs/skills/branching-and-issues.md](../../../docs/skills/branching-and-issues.md) — branch naming, commit language, PR requirements
- `.github/PULL_REQUEST_TEMPLATE.md` — read at stage 5, not before; every section must be filled for real

AGENTS.md is already in your context — every session loads it through `CLAUDE.md`.
Do not read it again; that is a duplicate copy of the largest governing document,
re-sent on every turn for the rest of the run. Its "Minimum required skills by
area" list is the area-skill mapping you need, already resident, and it keys on the
kind of work rather than on the `area:*` label — so translate: `area:favorites` →
favorites work, `area:storage` → the persistence rules under weather/query work,
`area:app-shell` and `area:routing` → no dedicated skill, use `fsd-boundaries.md`.
An issue carrying several `area:*` labels needs every matching skill named.
`docs/skills/README.md` indexes the skill files but does not carry this mapping;
you do not need to open it.

Do **not** read the area skill itself, `docs/skills/task-to-pr-automation.md`, or
any spec or source file. The area skill binds the implementation, so the
researcher, implementers, and reviewers read it — you only name its path in their
dispatches. `task-to-pr-automation.md` is the Codex fallback path; it tells you
nothing you need when `superpowers:*` is available.

AGENTS.md requires the area skill to be read before planning or execution. That
requirement is met by the agents doing those things, not by you — with one
exception: if you brainstorm a design decision (stage 3), the constraints binding
that decision must reach you first. Stage 2.5 tells the researcher to put them in
its summary.

## Hard rules

- Never commit to `main` or `release/*`, and never check out `main` to branch from it
- One issue per branch; branch name is `type/issue-area-slug`
- Korean for PR title/body, commit messages, code comments, and `docs/` files;
  English for `AGENTS.md`, `docs/agents/*`, `docs/skills/*`, and skill files
- Never edit implementation files yourself once stage 4 starts — every code change
  goes through an implementer subagent and its reviewers. Controller edits skip
  review and pollute the context that coordinates the run
- Never read a spec, source, or plan file yourself. If you need what it says,
  dispatch an agent that reads it and writes its findings to a path you hand on
  unopened. Composing the content in your own context first and _then_ writing it
  to a file saves nothing — the tokens are already resident. The saving comes from
  the reading happening somewhere else. This rule and the context budget below
  assume subagents exist; on a single-threaded host they do not apply (see the
  portability note)
- Dispatch prompts carry paths, not prose. A dispatch over ~2,000 characters means
  you pasted something that should have been a file
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

Isolation comes before research and planning because every artifact those stages
produce lives inside the worktree. Do the rest of the run in there. Install
dependencies only if the task needs package commands and `node_modules` is
missing.

Make the handoff directory the later stages write into. Use the absolute worktree
path everywhere — you will be working inside the worktree, where a relative
`.worktrees/<slug>/` resolves to a nested path that does not exist:

```bash
WT="$(git rev-parse --show-toplevel)/.worktrees/<slug>"   # from the main checkout
mkdir -p "$WT/.sdd"
```

`.sdd/` holds ground truth, briefs, reports, and diffs — the files subagents write
for each other and that you pass along without opening. It is scratch, not history.
The repo ignores it via a `/.sdd/` entry, which is separate from the `.worktrees/`
entry on purpose: inside a linked worktree, paths are evaluated from that
worktree's root, so `.worktrees/` does not cover them. Confirm once with
`git -C "$WT" status --short` — if `.sdd/` shows as untracked, the ignore rule did
not apply and the stage-5 clean-status check will fail.

Establish the baseline before any edit: run the checks the task's surface depends
on. A check that already fails is either in scope or a blocker — decide which, and
say which in the PR body. Discovering a pre-existing failure after implementation
makes it impossible to tell what your change broke.

Done-check: worktree on the right branch, clean status, `.sdd/` present, baseline
known.

### 2.5 Establish ground truth without reading anything

Intent: get the facts the plan needs into a file, without those facts passing
through your context on the way.

This stage exists because the alternative — you reading the spec and source files
to write an accurate plan — is what put 202k tokens under an 88-turn stage 4 in the
run this stage was designed from. In that run the controller read `specs.md`
(32k chars) and `specs-favorites.md` (22k chars), then pasted its conclusions into
a 16,159-character dispatch. Both copies stayed resident to the end.

Dispatch one researcher subagent. Give it:

- the issue number, and `gh issue view <N>` as its own job to run
- the worktree path and the branch name
- the area skill's path, from AGENTS.md's "Minimum required skills by area" — the
  path, since you have not read the skill. Name every skill a multi-area issue maps to
- the output path: `<worktree>/.sdd/ground-truth.md`
- what the plan will need from it: which files the change touches, what the code
  actually does today where the issue claims otherwise, the binding rules from
  AGENTS.md and the area skill quoted verbatim with their exact values, and any
  contradiction between the issue and those rules
- if you intend to brainstorm a design decision at stage 3: say so, and require the
  summary to carry the constraints that bind that specific decision. This is the one
  case where a rule has to reach you rather than only the file

Require it to return **only** the output path and a summary of at most five lines
and 600 characters. Give both limits — five lines of unbounded prose is not a
bound, and this summary is the one part of its work that becomes permanently
resident in your context. State the limits explicitly; an agent that reports its
findings in full has defeated the stage it was dispatched for. If a summary comes
back over the limit, do not re-read or re-summarize it — it is already resident,
and the only thing left to do is note it and carry on.

Read the five-line summary. Do not read `ground-truth.md`.

If the summary reports a contradiction between the issue and an AGENTS.md product
rule, that is a stop (see the stop list). Everything else, carry on.

Done-check: `<worktree>/.sdd/ground-truth.md` exists, you have its path and a
five-line summary, and you have not opened it.

### 3. Turn the issue into a plan file

Intent: SDD is parameterized on a plan file, so one must exist before stage 4 — and
it must exist without its text passing through you.

Judge how specified the issue is, from its body and the researcher's summary:

- **Concrete and bounded** — the issue names the defect or the change, and the
  summary names the files. Dispatch the planner directly.
- **A feature with real design questions** — several defensible shapes, and picking
  wrong wastes the whole run. Run `superpowers:brainstorming` yourself first: the
  design decision is yours to make, not a subagent's. It loads several thousand
  tokens of skill text into your floor, so spend it only when the shape is genuinely
  open — but it reads no project files, which is what makes it affordable at all.
  Pass its conclusion to the planner as a few lines of constraint. Brainstorming is
  a thinking step, not an interrupt; do not stop for Ori unless the ambiguity is one
  only Ori can resolve (see the stop list).
- **Too vague to plan at all** — the issue states a symptom with no reproduction and
  no acceptance criteria. Send the researcher back out with
  `superpowers:systematic-debugging` as its method and a reproduction as its
  deliverable, appended to `ground-truth.md`. An issue still unplannable after that
  is a stop.

Dispatch one planner subagent. Give it the ground-truth path, the issue number, the
worktree path, the branch name, any decision you reached by brainstorming, and
`superpowers:writing-plans` as the skill it must follow — that skill owns the plan's
shape, and it loads into the planner's context instead of yours. Its deliverables:

1. the plan at `docs/superpowers/plans/<date>-<slug>.local.md`, numbered tasks, each
   independently implementable
2. **a Global Constraints section** carrying the product rules from AGENTS.md and
   the area skill that bind this work — exact values, exact formats, quoted verbatim
   from `ground-truth.md`. Task reviewers in stage 4 use that section as their
   attention lens, so a rule missing there is a rule nobody checks
3. **one brief file per task** at `<worktree>/.sdd/task-<N>-brief.md`, each carrying
   that task's full requirements _and_ a copy of the Global Constraints — so a brief
   is the single self-contained thing an implementer reads

It returns only the plan path, the task count, and one line per task. Not the plan.

Writing the briefs here, rather than at dispatch time, is what keeps stage 4's
prompts down to paths: the expensive artifact is built once by an agent whose
context is discarded, instead of assembled in yours once per task.

The `.local.md` suffix matters: `*.local.*` is git-ignored, which keeps the plan out
of the PR diff and out of the `docs/` Korean-language rule, so the plan can be
written in English for the subagents that consume it. A plan committed into the
branch turns a one-file fix into a review with tens of thousands of characters of
scaffolding in the diff — the reviewer's attention is the scarce resource the PR is
competing for.

Done-check: the plan file and one brief per task exist, you hold their paths and a
one-line-per-task list, and you have read none of them.

### 4. Build it with subagent-driven development

Intent: implement through subagents, with a review gate per task.

Invoke `superpowers:subagent-driven-development` with the plan file and follow it.
That skill owns the loop: ledger, per-task implementer, per-task review, the fix
loop and its cap, and the final whole-branch review.

**Check what that version can actually do before you rely on it.** The plugin is
updated continuously and several versions sit in the cache; the harness picks one,
and it is not always the newest or the one `installed_plugins.json` records. Do not
pin a version — pins rot as fast as paths do. Instead, read the `Base directory for
this skill:` line the `Skill` tool prints, and check that directory:

```bash
ls <sdd-base-dir>/scripts/ 2>/dev/null
```

Probe each helper separately and decide separately — a version may ship some and
not others, and "the directory exists" is not evidence that the one you are about
to call is in it. For each helper, use it if present, else do its job yourself:

- **`review-package`** — writes the diff to a file so the reviewer reads it instead
  of you carrying it. This is the one that matters most. Without it:

  ```bash
  { git log --oneline BASE..HEAD; git diff --stat BASE..HEAD; git diff -U10 BASE..HEAD; } \
    > <worktree>/.sdd/review-<N>.diff
  ```

- **`task-brief`** — extracts one task's text to a file. Without it, nothing is
  needed: stage 3 already wrote `<worktree>/.sdd/task-<N>-brief.md`. Pass that path.
- **`sdd-workspace`** — resolves a per-plan artifact directory. Without it, use
  `<worktree>/.sdd/` and keep the ledger at `<worktree>/.sdd/progress.md`.

Never call a helper you have not seen in the listing, and never skip a handoff
because its helper is missing — the fallback is the point.

Also check how many reviewers that version wants. Versions with a single combined
`task-reviewer-prompt.md` gate spec and quality in one dispatch; older ones split it
into `spec-reviewer-prompt.md` and `code-quality-reviewer-prompt.md` and cost you
roughly twice the dispatches for the same gate. Follow whichever the loaded version
ships — but count on the split one being slower, and say so in the PR body if the
run was expensive.

Never state a version's capabilities from memory, including this file's description
of them. Check the directory.

**When a review finding collides with the plan, ask who wrote the constraint.**
SDD treats plan conflicts as the human's call, but most of the plan is text _you_
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
this class of work, name the _falsifying condition_ rather than describing the
problem: "this test must fail when `getServerSnapshot` is reverted to X." Without a
stated discriminator, implementers satisfy one property by trading away another —
and the trade is invisible in a green suite.

**When a subagent dies mid-task** (session limit, crash), do not re-dispatch blind.
Its uncommitted work is usually intact and worth keeping. First verify integrity:
`git status`, and specifically confirm that any file it reverted _temporarily_ for
testing was restored — an implementer killed between "revert to prove the guard
fires" and "restore" leaves the bug reinstated in the worktree. Then resume the same
agent with what remains; its context survives.

**Every dispatch is paths plus a handful of lines.** An implementer dispatch is the
brief path, the ground-truth path, the report path it must write, the branch name,
and one line saying where the task sits in the plan. That is the whole prompt — the
brief already carries the requirements and the Global Constraints, which is why
stage 3 built it. A reviewer dispatch is the same brief path, the report path, the
diff path, and — like every other dispatch, per the hard rules — the branch name
with the `git status --short --branch` check before it acts. Reviewers get their
constraints by reading the brief; do not retype the rules into the prompt.

The number to watch is the dispatch's own length. The run this stage was designed
from sent a 16,159-character implementer prompt whose bulk was a "ground truth
verified by the coordinator" block — research the controller had done itself and
then paid for twice, once resident and once as payload. Under this shape the same
dispatch is a few hundred characters.

What this repo adds on top of SDD:

- Every dispatch names the branch and requires `git status --short --branch` before
  the first commit
- Implementers write commit messages in Korean, Conventional Commits format
- Implementers run `pnpm lint`, `pnpm typecheck`, and the tests covering their
  change; UI changes also need Playwright smoke and a screenshot, with the artifact
  path in the report
- Behavior changes update the matching doc/skill/spec file in the same PR
- Subagents report status, commits, a one-line test summary, and concerns — the
  detail goes in their report file. Say this in the dispatch; a full report in the
  return payload is resident for the rest of the run

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

**The run is not finished when the PR opens — it finishes when CI passes.** Watch
it, but not from here: by stage 5 your context is at its heaviest, and
`gh run watch` streams. Redirect it and read only the exit code:

```bash
gh run watch <run-id> --exit-status > "$WT/.sdd/ci.log" 2>&1; echo "exit=$?"
```

`gh run watch` blocks until the run ends and has no timeout of its own, so a hung
runner hangs you. Bound it with the tool's own timeout rather than waiting
indefinitely, and re-issue the watch if it returns without a verdict — a timed-out
watch says nothing about the run.

On failure, dispatch an agent with the log path and the branch to diagnose and fix.
Do not read the log yourself, and do not fix CI by hand — the same rule that governs
stage 4 governs here, and this is the most expensive point in the session to break
it.

A suite that is green on your machine is evidence about your machine. CI runs on
different hardware, headless, with different timing, and any behaviour that depends
on those — hydration mismatches, races, animation, anything timing-sensitive —
can appear or vanish there. This is not hypothetical: a run of this skill opened a
PR after 34/34 passed locally, and CI failed three tests immediately, because a
check had been built to _require_ a nondeterministic condition that simply did not
occur on the runner.

Two rules follow. First, never report a PR as done on local output alone. Second, a
mechanism that asserts a fault _must_ occur will fail wherever that fault is
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

## Context budget

Stage 4's cost is `turns × your resident context`, and it runs 80-200 turns. The
floor you carry into it is therefore the single number that decides whether the run
finishes or dies at a usage limit.

**Target: under 100k tokens when you invoke SDD.** The run that motivated this
budget entered stage 4 at 202k and spent 17.7M of its 34.4M input budget re-sending
that floor across 88 turns — for a documentation-only PR with three tasks.

You cannot read your own usage mid-run, so check the proxy: by the end of stage 3
you should have opened the issue body, `branching-and-issues.md`, and nothing else.
No spec file, no source file, no area skill, no plan, no brief, no ground-truth. If
you have opened one of those, the budget is already gone and the rest of the run
pays for it.

Afterwards, the real numbers are in the session transcript at
`~/.claude/projects/<project-slug>/<session-id>.jsonl`. Each assistant line carries
`message.usage`; resident context per turn is
`cache_read_input_tokens + cache_creation_input_tokens + input_tokens`. Plot it
across turns and the jumps name the stage that added the weight. Cache reads bill at
a discount, so treat the absolute totals as directional and the trajectory as exact.

## Verification

Before claiming the run is done, confirm each of these from real output:

- `git status --short --branch` — on the feature branch, clean tree
- `git log --oneline origin/main..HEAD` — commits present, Korean messages
- `pnpm lint`, `pnpm typecheck`, and the tests for the touched surface — passing
- `gh pr view <PR> --json url,body,labels,assignees,milestone` — body complete,
  metadata matches the issue
- `gh issue view <N> --json labels` — carries `status:review`
- `ls <worktree>/.sdd/` — ground-truth, briefs, and reports exist as files, which is
  the evidence the handoffs happened rather than being inlined. Claude Code only;
  under the single-threaded Codex path there are no handoffs to evidence

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
  for stages 2 onward and implement stage 4 single-threaded, keeping the per-task
  review gate as a self-review pass against the plan's Global Constraints. Running
  single-threaded means the reading has nowhere else to happen: the no-reading hard
  rule, the context budget, and the `.sdd/` verification line are all Claude Code
  provisions and are suspended here. Stages 2.5 and 3 collapse into reading the
  files and writing the plan directly. Still write `ground-truth.md` and the plan
  to disk — not to save context, which is unreachable here, but because they are
  what a resumed or handed-over session reads instead of re-deriving.
