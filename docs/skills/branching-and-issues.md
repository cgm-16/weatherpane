# Branching and Issues

## When to use this skill

- Any task that requires a new branch, issue, commit, or PR
- Any time you need to confirm the correct branch naming or issue-to-branch mapping
- Before creating or reviewing a PR

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/skills/github-flow-and-release.md](./github-flow-and-release.md)
- [.github/ISSUE_TEMPLATE](../../.github/ISSUE_TEMPLATE)
- [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
- `git status --short --branch`

## Hard rules

- Every implementation branch maps to one issue.
- Branch name format: `type/issue-area-slug`
- Allowed types: `feat`, `fix`, `docs`, `ci`, `chore`, `hotfix`, `refactor`, `test`
- No direct commits to `main` or `release/*`
- No silent scope expansion inside a PR
- If work grows beyond the original issue, open a follow-up issue before expanding

## Execution checklist

1. Intent: confirm or create the backing issue before creating a branch.
   Action:
   - check if an issue number was provided; if not, open one using the matching template
   - use `bug.yml` template for defect or debugging work
   - use `task.yml` template for feature, refactor, or chore work
   - use `documentation.yml` template for docs-only work
   - fill every required section; write `N/A` with a reason for non-applicable sections
   Done-check: an issue number exists and is ready to map to the branch.

2. Intent: create a branch with the correct name.
   Action:
   - build the branch name as `type/issue-area-slug`
   - confirm `.worktrees/` is in `.gitignore` before creating a worktree
   Done-check: branch name matches the pattern and maps to the issue.

3. Intent: keep commits reviewable and scoped.
   Action:
   - commit one logical unit at a time
   - use Conventional Commits format
   - commit messages must be in Korean (see AGENTS.md documentation rules); exceptions: `docs/agents/*` and `docs/skills/*` files may use English commit messages
   Done-check: each commit can be explained without referring to unrelated edits.

4. Intent: prepare a reviewable PR.
   Action:
   - use `.github/PULL_REQUEST_TEMPLATE.md`
   - link the issue; keep the issue open until the PR merges
   - state in-scope and out-of-scope work
   - list test evidence and screenshots for UI changes
   - note spec alignment, risks, and rollback notes
   Done-check: PR description answers all required template sections without placeholders.

## Verification

- `git status --short --branch` confirms branch name matches `type/issue-area-slug`
- Confirm the PR links the issue
- Confirm the issue stays open until merge

## Stop and ask Ori

- The correct issue template is ambiguous for the task type
- The branch cannot map cleanly to a single issue
- A PR section in the template cannot be filled without inventing scope

## Portability note

Codex: run `git` and `gh` commands directly in the shell.
Claude Code: run `git` and `gh` commands via the `Bash` tool. Use `superpowers:using-git-worktrees` skill for worktree creation and `superpowers:finishing-a-development-branch` for PR preparation.
