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
- Release from tags. Pushing a `vX.Y.Z` tag on `main` triggers `.github/workflows/production-sync.yml`, which opens a `production <- main (vX.Y.Z)` PR for human review/merge. Its head is one promotion commit whose sole parent is the fetched `production` tip and whose tree exactly matches the tag; it does not branch from the tagged commit. Merging that PR is what deploys to Vercel Production — never commit or push directly to `production`. Both `production` and `main` are covered by an active GitHub ruleset ("base rules") that requires a PR, enforces linear history, and restricts merges to `allowed_merge_methods: ["rebase"]` — merge sync PRs with "Rebase and merge". Sync PRs are exempt from the `Closes #<issue>` check in `agent-guardrails.yml` (base ref `production`), since they promote content already issue-linked on `main`.

## Reading `production` vs `main` divergence

- `production` and `main` have different commit graphs even when their content matches exactly. Rebase-only promotion does not advance their common ancestor. A branch created at a main tag can therefore conflict with production on changes already released; matching the previous tag's tree does not guarantee mergeability. A production-parented snapshot commit avoids replaying that divergent history and adds one promotion commit per release.
- Do not treat a nonzero `git log origin/main..origin/production` count, or a GitHub compare page showing "N commits ahead," as a problem on its own. The health check is content, not ancestry: `git diff <latest-tag> origin/production` (should be empty), or `production-drift-check.yml`'s weekly tree-hash comparison.
- Known baseline: as of `v1.0.0`, `production` carries 5 commits with no equivalent SHA on `main` — 4 from PR #70 (2026-04-22, compliant rebase-merge) and 1 from PR #111 (2026-08-05, a ruleset bypass that used "Create a merge commit" instead of rebase). Both are historical; `production`'s tree matches `v1.0.0` exactly. Do not "clean up" this history — `production` is a live Vercel deploy target and a shared branch (see "Do not rebase pushed shared branches" above).

## Execution checklist

1. Intent: fetch the base branch ref before feature work.
   Action:
   - `git fetch origin main`
     Done-check: `origin/main` is refreshed without changing the current branch, or the fetch failure is surfaced immediately.

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
   - create the worktree with `git worktree add .worktrees/branch-slug -b branch-name origin/main`
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

6. Intent: cut a release (promote `main` to `production`).
   Action:
   - `git fetch origin main production --tags`; confirm `main` is green (`ci.yml` passing) at the exact commit to release
   - choose the next `vMAJOR.MINOR.PATCH` tag
   - `git tag vX.Y.Z <verified-main-sha> && git push origin refs/tags/vX.Y.Z`; keep published tags immutable
   - wait for `production-sync.yml` to open the `production <- main (vX.Y.Z)` PR
   - `gh pr view <N> --json mergeable,mergeStateStatus,baseRefOid,headRefOid,statusCheckRollup`; wait through `UNKNOWN`, require `MERGEABLE`, passing required checks, and report any remaining review/ruleset restrictions
   - fetch the PR head and production refs; verify the head's sole parent equals the current production tip and `git diff --exit-code vX.Y.Z <pr-head-sha>` is empty. If either ref changes, repeat the checks
   - hand off only after those checks; workflow success and PR creation alone are not release readiness
   - when Ori authorizes deployment, review the diff and merge using "Rebase and merge"
     Done-check: distinguish a verified PR awaiting Ori from a deployed release. Deployment is complete only when Vercel Production succeeds at the resulting production commit and its tree matches the tag (`git diff --exit-code vX.Y.Z origin/production`); rebase means the deployment SHA need not equal the tag SHA. `production-drift-check.yml` should report no drift on its next run (or via manual `workflow_dispatch`).

## Verification

- `git status --short --branch`
- `git diff --check`
- confirm the branch name matches `type/issue-area-slug`
- confirm the PR links the issue and keeps the issue open until merge
- `pnpm exec vitest run tests/production-sync.test.ts` exercises the workflow shell with real local Git repositories: divergent release history, exact snapshot promotion, repeated runs, and consecutive releases
- after a tag push: verify sync PR mergeability, required checks, production parent, and tag-tree equality before handoff; confirm no open `[release-drift]` issue once merged
- do not use a nonzero `git log origin/main..origin/production` count as a drift signal by itself — see "Reading `production` vs `main` divergence" above

## Stop and ask Ori

- `git fetch origin main` fails
- the issue or PR template cannot represent the required scope cleanly
- worktree setup is blocked and a fallback would change the workflow
- release work needs a backport decision that is not already specified
- a `production <- main` sync PR's diff includes anything unexpected for the tag being released
- a sync PR conflicts, its parent is not current production, or its tree differs from the tag; recover through a replacement production-based snapshot PR without rewriting published history or moving the tag
- a `[release-drift] production is behind vX.Y.Z` issue is open for a reason other than an unmerged sync PR

## Portability note

Codex: run `git` and `gh` commands directly in the shell.
Claude Code: run `git` and `gh` commands via the `Bash` tool. Use `superpowers:using-git-worktrees` skill for worktree creation. Use `superpowers:finishing-a-development-branch` skill for PR preparation. The issue, branch, and PR requirements are identical.
