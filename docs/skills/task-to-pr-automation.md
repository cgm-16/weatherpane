# Task To PR Automation

## When to use this skill

- Any time Codex should carry work from issue intake through branch, worktree, verification, push, and PR creation
- Any task where missing PR metadata, skipped preflight, or broken verification would cause review churn
- Any task where the repo workflow is correct in pieces but easy to miss end-to-end

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/agents/codex-workflow.md](../agents/codex-workflow.md)
- [docs/skills/branching-and-issues.md](./branching-and-issues.md)
- [docs/skills/github-flow-and-release.md](./github-flow-and-release.md)
- [docs/skills/testing-and-mocks.md](./testing-and-mocks.md)
- [.github/ISSUE_TEMPLATE](../../.github/ISSUE_TEMPLATE)
- [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
- `git status --short --branch`

## Hard rules

- Do not edit on `main` or `release/*`.
- Every implementation branch maps to one backing issue.
- Use `type/issue-area-slug` branch names and project-local `.worktrees/` by default.
- Treat issue mapping as a real check, not an assumption; local task ids and GitHub issue numbers may differ.
- Verify the implementation worktree before claiming completion.
- If connector-based PR creation is blocked, use `gh pr create` instead of leaving the branch without a PR.
- When the backing issue already has assignees, labels, or a milestone, copy that metadata to the PR.

## Execution checklist

1. Intent: confirm the exact backing issue before creating a branch.
   Action:
   - inspect the user request, local task docs, and GitHub issue state
   - if no issue was provided, open one using the matching template in `.github/ISSUE_TEMPLATE/`
   - for docs-only work, use `documentation.yml`; for feature/refactor work, use `task.yml`; for defects, use `bug.yml`
   - fill every required section; write `N/A` with a reason when needed
     Done-check: one GitHub issue number exists, and any local task id or spec id is explicitly mapped to it.

2. Intent: sync the base branch and create an isolated worktree.
   Action:
   - `git fetch origin main`
   - `git pull --ff-only origin main`
   - `git check-ignore -v .worktrees`
   - `git worktree add .worktrees/<branch-slug> -b <type/issue-area-slug>`
   - in the new worktree: `git status --short --branch`
     Done-check: the worktree is on the correct branch, starts clean, and any fast-forward or permission problem has been surfaced before edits.

3. Intent: establish a clean baseline before implementation.
   Action:
   - install dependencies in the worktree only if the task needs package commands and `node_modules` is missing
   - run the minimum baseline checks that matter for the task surface
   - if a baseline check already fails, decide whether that failure is task scope or a blocker before editing
     Done-check: baseline state is known, and pre-existing failures are either accepted as task scope or raised to Ori explicitly.

4. Intent: implement the task without losing workflow context.
   Action:
   - keep a `.memory-*.local.md` note in the worktree for issue mapping, pitfalls, and unrelated findings
   - follow the nearest area skills for implementation and verification
   - when a command fails for network, port-binding, or sandbox reasons, retry with elevated permissions instead of guessing at workarounds
     Done-check: implementation changes stay scoped, and workflow decisions are recorded instead of being re-inferred.

5. Intent: verify completion with the real repository surface.
   Action:
   - run the required checks for the touched surface, for example `pnpm lint`, `pnpm typecheck`, targeted `vitest`, targeted `playwright`, or docs-only diff checks
   - if UI changed, capture a screenshot or Playwright trace and mention the artifact path
   - review `git diff --check` and `git diff --stat`
     Done-check: every completion claim is backed by fresh command output, and any missing verification is reported as a gap.

6. Intent: create a complete PR instead of stopping at `git push`.
   Action:
   - push the branch: `git push -u origin <branch>`
   - create the PR with `.github/PULL_REQUEST_TEMPLATE.md`
   - if connector PR creation fails because the integration lacks permission, run `gh pr create` with the same content
   - make sure the PR body links the issue, states in-scope and out-of-scope work, includes test evidence, and notes risks and rollback
     Done-check: a PR URL exists and the template sections are filled without placeholders.

7. Intent: sync PR metadata from the backing issue.
   Action:
   - inspect issue metadata with `gh issue view <issue> --json assignees,labels,milestone`
   - inspect PR metadata with `gh pr view <pr> --json assignees,labels,milestone`
   - apply missing assignees, labels, and milestone with `gh pr edit`
     Done-check: the PR carries the same assignees, labels, and milestone as the backing issue unless Ori asked for a deliberate difference.

## Verification

- `git status --short --branch`
- `git check-ignore -v .worktrees`
- `git diff --check`
- `git diff --stat`
- the task-specific repository checks named by the relevant area skill
- `gh issue view <issue> --json assignees,labels,milestone`
- `gh pr view <pr> --json assignees,labels,milestone`

Expected evidence:

- one issue number
- one isolated branch/worktree
- fresh verification output for the touched surface
- one PR URL
- PR metadata aligned with the issue

## Stop and ask Ori

- `git pull --ff-only origin main` fails after an elevated retry
- the branch cannot map cleanly to a single issue
- the baseline is broken and it is unclear whether the failure belongs to the task
- the PR template cannot be filled without inventing scope or test evidence
- both connector PR creation and `gh pr create` are blocked
- issue metadata should not be copied to the PR, but the desired exception is not explicit

## Portability note

- Codex: run `git`, `gh`, `pnpm`, `vitest`, and `playwright` commands directly in the shell; use elevated execution when sandbox limits block network or local server binding.
- Claude Code: run the same commands via the `Bash` tool. Use `superpowers:using-git-worktrees` for worktree creation and `superpowers:finishing-a-development-branch` for PR closeout. The issue mapping, PR template, and metadata sync rules stay the same.
