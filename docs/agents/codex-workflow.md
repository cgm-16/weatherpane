# Codex Workflow

Use this file as the default execution loop for non-trivial Weatherpane work.

## Step 1: Load constraints before touching code

Intent: make sure repository rules and product contracts are in scope before planning or editing.

Exact actions:
- Read [AGENTS.md](../../AGENTS.md).
- Read [docs/agents/README.md](./README.md).
- Read the nearest relevant files in [docs/skills](../skills/README.md).
- Search repo-local memory before complex work: `rg --files -g '.memory-*.local.md' .`

Done-check:
- The relevant product rules, workflow rules, and area playbooks are named explicitly in the working context.
- Any existing local memory note relevant to the task has been read.

## Step 2: Ground in the current implementation

Intent: gather repo truth before proposing changes.

Exact actions:
- Inspect current files with targeted search first, for example: `rg -n "search|favorites|weather" app docs tests`
- Read the files that own the behavior you are about to change.
- Check recent history when it materially affects the task: `git log --oneline -5`

Done-check:
- The current owner files, current behavior, and nearby tests are identified.
- Open questions are limited to intent gaps, not discoverable repo facts.

## Step 3: Run implementation preflight for non-trivial changes

Intent: satisfy the repository workflow before editing tracked files.

Exact actions:
- Sync the base branch:
  - `git fetch origin main`
  - `git pull --ff-only origin main`
- Open or confirm the backing issue using the matching GitHub template or an equivalent body with all required sections filled.
- Create the branch using `type/issue-area-slug`.
- Use a git worktree by default:
  - verify the local worktree directory is ignored: `git check-ignore -v .worktrees`
  - create the worktree: `git worktree add .worktrees/branch-slug -b branch-name`
- Install dependencies in the new worktree only if they are missing or the lockfile/manifests require it.

Done-check:
- A backing issue exists.
- The branch name follows the repository convention.
- The implementation worktree is clean and isolated.
- If worktree setup is blocked, the reason is stated explicitly before falling back to another approach.

## Step 4: Plan with executable steps

Intent: avoid vague plans and keep changes reviewable.

Exact actions:
- Write the task as ordered steps.
- Each step must include:
  - action intent
  - exact command or concrete action
  - done-check
- If new evidence changes the approach, publish a plan delta before continuing.

Done-check:
- The next step is executable without guesswork.
- Any change in approach is explained before more work is done.

## Step 5: Implement the smallest reasonable change

Intent: preserve scope and avoid opportunistic edits.

Exact actions:
- Change only the files required for the task.
- Match surrounding style and keep existing comments unless they are provably false.
- Update the relevant doc or spec in the same branch when behavior changes.
- Record unrelated findings in a `.memory-*.local.md` file instead of folding them into the task.

Done-check:
- Every tracked edit has a direct reason tied to the task.
- No unrelated cleanup or silent scope expansion is mixed into the branch.

## Step 6: Verify with fresh evidence

Intent: do not claim completion from inspection alone.

Exact actions:
- Run the required checks for the touched surface.
- Read the output and report the actual result.
- If a required check cannot run because the repo or environment lacks the script or dependency, say that explicitly instead of implying success.

Minimum repository checks before completion:
- `pnpm typecheck`
- the relevant targeted unit or integration test command for touched behavior
- the relevant Playwright smoke command when a user flow changed
- screenshots or traces for UI changes

Done-check:
- Completion claims are backed by fresh command output from the implementation worktree.
- Any missing verification is called out as a limitation, not glossed over.

## Step 7: Close out cleanly

Intent: leave a reviewable branch with clear context.

Exact actions:
- Review the final diff: `git diff --stat` and `git diff --check`
- Summarize what changed, what was verified, and any remaining risk.
- Link the issue in the PR using the repository template.

Done-check:
- The branch is scoped, explainable, and ready for review.
- The summary distinguishes completed verification from remaining follow-up.

## Stop and ask Ori

Stop instead of guessing when:
- the spec and current code disagree in a way that changes product behavior
- the base branch cannot fast-forward cleanly
- worktree setup, issue creation, or push/PR flow is blocked in a way that changes the workflow
- the first attempted fix fails and the root cause is still unclear

## Portability note

Other agents can reuse this workflow, but the command examples and branching expectations are written for Codex in this repository.
