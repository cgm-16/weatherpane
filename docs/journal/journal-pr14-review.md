# PR 14 Review Note

## Goal

- Inspect PR 14 review threads and map each unresolved actionable comment to either:
  - a minimal code/doc/test change, or
  - a proposed written response when no code change is appropriate.

## Constraints

- Follow `AGENTS.md` and `docs/agents/codex-workflow.md`.
- Keep scope limited to PR 14 review feedback.
- Record unrelated findings here instead of fixing them opportunistically.

## Findings

- `git pull --ff-only origin main` failed once with `Cannot fast-forward to multiple branches.` A later elevated retry from the same checkout succeeded with `Already up to date.` Cause remains unclear; treat as a workflow anomaly and avoid assuming it was a permission problem.
- PR 14 review state:
  - outdated-but-unresolved threads in `browser-storage.ts` and the guarded `getItem` path were already fixed on branch `dc84c22`
  - valid unresolved threads addressed in working tree:
    - docs wording now uses payload `version` for versioned Web Storage
    - persisted favorite validation now rejects nicknames longer than 20 characters
    - record repository validation now rejects arrays
    - versioned storage helpers now swallow `removeItem`/`setItem` failures
- CodeRabbit nitpick about extracting shared validators across snapshot models was left out of scope for this pass.
- Follow-up review after push:
  - valid: location timestamp guards were too loose and favorite `order` accepted negatives/fractions
  - valid: storage examples in `docs/specs.md` drifted from `VersionedPayload<T>` and the actual persisted favorites shape
  - implemented a strict ISO datetime validator in `frontend/entities/location/model/types.ts`
  - implemented non-negative integer validation for `FavoriteLocation.order`
  - added direct validator tests in `tests/location-types.test.ts`
  - aligned storage docs/examples with `VersionedPayload<T>` using `data` + `version`
- Latest follow-up review after `0bbaee4`:
  - valid: `docs/specs.md` persisted summary snapshot example still used `tempC` and `sketchKey`, which did not match `PersistedWeatherSnapshot`
  - fixed by changing the example JSON to `temperatureC` and removing `sketchKey`
- Latest follow-up review after `5ebaf09`:
  - valid: `docs/specs.md` interface examples still used `tempC` and retained summary-only fields that no longer matched `PersistedWeatherSnapshot`
  - fixed `WeatherSummarySnapshot` to match the persisted model (`temperatureC`, no `sketchKey`, no `lastError`)
  - normalized `WeatherDetailSnapshot` temperature field names to `temperatureC` without inventing a new persisted detail contract

## Unrelated Findings

- None yet.
