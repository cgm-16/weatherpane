# GitHub Workflow With GitLab Flow Semantics

## When to use this skill

- Any task that will create or update a branch, issue, commit, or PR
- Any release or stabilization work that touches `release/*`
- Any task where workflow drift would be as harmful as the code change itself

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/skills/branching-and-issues.md](./branching-and-issues.md)
- [.github/ISSUE_TEMPLATE](../../.github/ISSUE_TEMPLATE)
- [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
- `git status --short --branch`

## Hard rules

- Start from `main` and target `main`.
- Release stabilization happens on `release/*`.
- Fix on `main` first, then port to `release/*` only if needed.
- Do not commit directly to `main` or `release/*`.
- Use `type/issue-area-slug` branch names.
- Every implementation branch maps to one issue.
- Do not rebase pushed shared branches.
- Do not silently expand scope inside a PR.
- Release from tags.

## Execution checklist

1. Intent: sync the base branch before feature work.
   Action:
   - `git fetch origin main`
   - `git pull --ff-only origin main`
   Done-check: local `main` matches `origin/main`, or the fast-forward failure is surfaced immediately.

2. Intent: create the backing issue before editing tracked files.
   Action:
   - choose the matching issue template in `.github/ISSUE_TEMPLATE/`
   - fill every required section
   - if a section does not apply, write `N/A` with a reason
   Done-check: an issue number exists and the branch can map to it.

3. Intent: create an isolated implementation branch.
   Action:
   - build the branch name as `type/issue-area-slug`
   - verify `.worktrees/` is ignored with `git check-ignore -v .worktrees`
   - create the worktree with `git worktree add .worktrees/branch-slug -b branch-name`
   Done-check: the new worktree is on the correct branch and `git status --short --branch` is clean there.

4. Intent: keep commits reviewable and scoped.
   Action:
   - commit one logical unit at a time
   - use Conventional Commits
   - keep commit messages in Korean unless the repository rules explicitly exempt the file
   Done-check: each commit can be explained without referring to unrelated edits.

5. Intent: prepare a reviewable PR.
   Action:
   - use `.github/PULL_REQUEST_TEMPLATE.md`
   - link the issue
   - state in-scope and out-of-scope work
   - note spec alignment, tests run, risks, rollback notes, and screenshots for UI changes
   Done-check: the PR description answers the template without placeholders or silent omissions.

## Verification

- `git status --short --branch`
- `git diff --check`
- confirm the branch name matches `type/issue-area-slug`
- confirm the PR links the issue and keeps the issue open until merge

## Stop and ask Ori

- `git pull --ff-only origin main` fails
- the issue or PR template cannot represent the required scope cleanly
- worktree setup is blocked and a fallback would change the workflow
- release work needs a backport decision that is not already specified

## Portability note

Non-Codex agents can reuse this workflow, but they should swap in their own GitHub tooling while preserving the same issue, branch, and PR requirements.
