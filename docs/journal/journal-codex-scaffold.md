# Codex scaffolding notes

## 2026-04-10

- Goal: scaffold Weatherpane's agent guidance so docs are Codex-first instead of mostly agent-agnostic.
- Approved shape:
  - two-layer guidance (`docs/agents/*` + `docs/skills/*`)
  - initial pass is structure plus exemplar rewrites
  - exemplar skills: workflow/release, testing/mocks, search/location resolution
  - format: executable checklists
  - audience: Codex-first with brief portability notes
- Workflow constraint discovered during execution:
  - repo requires `git worktree`, but `.worktrees/` is not yet ignored in `.gitignore`
  - Ori approved using project-local `.worktrees/`
  - need a bootstrap branch step so `.worktrees/` can be committed before the main worktree is created
