# Claude Code Workflow

Use this file as the default execution loop for non-trivial Weatherpane work when running as Claude Code.

Read [docs/agents/codex-workflow.md](./codex-workflow.md) if you are running as Codex instead.

## Step 1: Load constraints before touching code

Intent: ensure repository rules and product contracts are in scope before planning or editing.

Exact actions:
- Read [AGENTS.md](../../AGENTS.md) using the `Read` tool.
- Read [docs/agents/README.md](./README.md) using the `Read` tool.
- Read the nearest relevant files in [docs/skills](../skills/README.md) using the `Read` tool.
- Search repo-local memory for relevant past work:
  - Use `Glob` tool with pattern `.memory-*.local.md` in the repo root.
  - Read any matching files with the `Read` tool.
- Check persistent memory at `/Users/ori/.claude/projects/-Users-ori-repos-weatherpane/memory/MEMORY.md` using the `Read` tool.

Done-check:
- The relevant product rules, workflow rules, and area playbooks are named explicitly in the working context.
- Any existing local or persistent memory note relevant to the task has been read.

## Step 2: Ground in the current implementation

Intent: gather repo truth before proposing changes.

Exact actions:
- Use the `Grep` tool to locate the files owning the behavior you are about to change. Example: search `search|favorites|weather` across `app/`, `docs/`, `tests/`.
- Read the owner files with the `Read` tool.
- Check recent history when it materially affects the task:
  - Use `Bash` tool: `git log --oneline -5`

Done-check:
- The current owner files, current behavior, and nearby tests are identified.
- Open questions are limited to intent gaps, not discoverable repo facts.

## Step 3: Run implementation preflight for non-trivial changes

Intent: satisfy the repository workflow before editing tracked files.

Exact actions:
- Sync the base branch using `Bash` tool:
  - `git fetch origin main`
  - `git pull --ff-only origin main`
- Open or confirm the backing issue using `Bash` tool with the `gh` CLI and the matching template in `.github/ISSUE_TEMPLATE/`:
  - `gh issue create` (use `task.yml` template for feature/chore work, `bug.yml` for defect work)
- Use `superpowers:using-git-worktrees` skill to create the implementation worktree on a `type/issue-area-slug` branch.

Done-check:
- A backing issue exists.
- The branch name follows `type/issue-area-slug`.
- The implementation worktree is clean and isolated.
- If worktree setup is blocked, the reason is stated explicitly before falling back.

## Step 4: Plan with executable steps

Intent: avoid vague plans and keep changes reviewable.

Exact actions:
- For non-trivial tasks, activate plan mode by invoking the `superpowers:writing-plans` skill before touching any files.
- Write the task as ordered steps. Each step must include:
  - action intent
  - exact tool call or command
  - done-check
- If new evidence changes the approach, publish a plan delta before continuing.

Done-check:
- The next step is executable without guesswork.
- Any change in approach is explained before more work is done.

## Step 5: Implement the smallest reasonable change

Intent: preserve scope and avoid opportunistic edits.

Exact actions:
- Use the `Edit` tool for targeted modifications to existing files.
- Use the `Write` tool only for new files or complete rewrites (must `Read` first).
- Apply `superpowers:test-driven-development` skill: write failing tests before implementing behavior.
- Apply `superpowers:systematic-debugging` skill when investigating any bug or unexpected behavior.
- Update the relevant doc or spec in the same branch when behavior changes.
- Record unrelated findings in a `.memory-*.local.md` file using the `Write` tool, or save to persistent memory. Do not fold them into the task.

Done-check:
- Every tracked edit has a direct reason tied to the task.
- No unrelated cleanup or silent scope expansion is mixed into the branch.

## Step 6: Verify with fresh evidence

Intent: do not claim completion from inspection alone.

Exact actions:
- Apply `superpowers:verification-before-completion` skill before claiming any task complete.
- Run checks via `Bash` tool from the implementation worktree:
  - `pnpm typecheck`
  - `pnpm exec vitest run path/to/changed.test.ts` for touched logic
  - `pnpm exec playwright test path/to/changed-flow.spec.ts` when a user flow changed
- If a required check script does not exist, report that gap explicitly instead of implying success.

Done-check:
- Completion claims are backed by fresh command output from the implementation worktree.
- Any missing verification is called out as a limitation, not glossed over.

## Step 7: Close out cleanly

Intent: leave a reviewable branch with clear context.

Exact actions:
- Apply `superpowers:finishing-a-development-branch` skill to decide how to integrate the work.
- Review the final diff using `Bash`: `git diff --stat` and `git diff --check`.
- Create PR using `Bash` with `gh pr create`, referencing `.github/PULL_REQUEST_TEMPLATE.md`.
- Link the issue in the PR body. Keep the issue open until merge.

Done-check:
- The branch is scoped, explainable, and ready for review.
- The summary distinguishes completed verification from remaining follow-up.

## Stop and ask Ori

Stop instead of guessing when:
- the spec and current code disagree in a way that changes product behavior
- `git pull --ff-only origin main` fails
- worktree setup, issue creation, or push/PR flow is blocked in a way that changes the workflow
- the first attempted fix fails and the root cause is still unclear
- a tool call fails with no explainable reason

## Portability note

This workflow is written for Claude Code. For Codex, use [docs/agents/codex-workflow.md](./codex-workflow.md) instead.
