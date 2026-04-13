# Prompt Task Split Planning Notes

## 2026-04-11

- User request: read `docs/prompt.md`, `docs/taskmap.md`, `docs/issues.md`; split the prompt plan into task files under `docs/tasks`; then open milestones and issues with appropriate labels and assignees.
- Session is in Plan Mode, so tracked-file edits and GitHub mutations are not allowed in this turn; produce a decision-complete plan instead.
- Required project guidance read:
  - `docs/agents/README.md`
  - `docs/agents/codex-workflow.md`
  - `docs/skills/github-flow-and-release.md`
- Repo state during planning:
  - branch: `main...origin/main`
  - no local tracked changes shown by `git status --short --branch`
- GitHub live state checked with escalated `gh`:
  - no milestones exist yet
  - assignable users: `cgm-16` only
  - open issues: none found
  - closed issues include #3 `[Task] 에이전트 문서 Claude Code 지원 추가`
- Existing labels confirmed:
  - `type:*`: bug, feature, chore, docs, ci, refactor, test
  - `status:*`: needs-triage, in-progress, ready, blocked
  - `priority:*`: p0, p1, p2, p3
  - `area:*`: app-shell, weather, favorites, search, routing, storage, assets, theme, a11y, docs, testing, ci
- `docs/taskmap.md` already recommends staged issue opening, not opening all 22 immediately:
  - immediate: WP-001..WP-004
  - after wave 1 settles: WP-005..WP-009
  - after vertical slice is visible: WP-010..WP-016
  - once saved-location flows are live: WP-017..WP-022
- Likely milestone strategy candidates:
  - waves (`Wave 0`..`Wave 8`) match `docs/taskmap.md`
  - chunks (`Chunk A`..`Chunk F`) match `docs/prompt.md`
- Important ambiguity to resolve with Ori if needed:
  - whether issues should be opened only for the first recommended batch or for all 22 tasks at once
  - whether milestones should follow waves or chunks
