# Weatherpane GitHub Governance Pack

This pack is a ready-to-drop repository scaffold for running Weatherpane on GitHub with GitLab Flow semantics.

## Included

- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/CODEOWNERS`
- `.github/workflows/agent-guardrails.yml`
- `AGENTS.md`
- `docs/skills/*`
- `config/labels.json`
- `config/milestones.json`
- `scripts/create-labels-and-milestones.sh`

## Immediate edits to make

1. Replace the placeholder owners in `.github/CODEOWNERS`
2. Replace the placeholder Discussions URL in `.github/ISSUE_TEMPLATE/config.yml`
3. Update `scripts/create-labels-and-milestones.sh` with your GitHub org/repo if needed
4. Review the label colors and milestone names before applying them

## Suggested branch strategy

Long-lived branches:
- `main`
- `release/v0.1`

Short-lived branches:
- `feat/...`
- `fix/...`
- `docs/...`
- `ci/...`
- `chore/...`
- `hotfix/...`
- `refactor/...`
- `test/...`

Format:

```txt
<type>/<issue-number>-<area>-<short-kebab-slug>
```

Examples:

```txt
feat/128-weather-query-home-detail
feat/141-search-korea-catalog-autocomplete
feat/173-favorites-edit-reorder-mode
fix/204-geolocation-timeout-recovery
docs/301-readme-deploy-env
ci/322-playwright-smoke-and-snapshots
```

Allowed `type`:
- `feat`
- `fix`
- `docs`
- `ci`
- `chore`
- `hotfix`
- `refactor`
- `test`

Allowed `area`:
- `app-shell`
- `weather`
- `search`
- `favorites`
- `routing`
- `storage`
- `assets`
- `theme`
- `a11y`
- `testing`
- `ci`
- `docs`

## Recommended branch protections

For `main`:
- require pull request before merge
- require 1–2 approvals
- require code owner review
- require conversation resolution
- require status checks
- require linear history
- disallow force push
- disallow deletion

Suggested required checks:
- `validate / lint`
- `validate / typecheck`
- `validate / unit`
- `validate / build`
- `validate / e2e-smoke`
- `validate / agent-guardrails`

## Suggested milestones

- `M0 - Repo Bootstrap & Guardrails`
- `M1 - Foundation & App Shell`
- `M2 - Weather Data + Search Core`
- `M3 - Favorites + Persistence`
- `M4 - Sketch Assets + Visual Polish`
- `M5 - QA + Deployment + Submission`
- `v0.1.0 - MVP Submission`
- `v0.1.x - Post-submission fixes`

## Suggested labels

Prefixes:
- `type:*`
- `status:*`
- `priority:*`
- `area:*`
- `kind:*`

See `config/labels.json` for the full set.

## Agent guidance

Root instructions live in `AGENTS.md`.

Area-specific guidance lives in `docs/skills/*`.

Rule: if a task touches an area, the corresponding skill file must be read before changes are proposed.

## Notes

- `AGENTS.md` is a project convention for agent tooling.
- The agent guardrails workflow included here is a lightweight starter. Adjust it to your exact PR process and CI names.
