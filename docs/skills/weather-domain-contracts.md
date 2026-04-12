# Weather Domain Contracts

## When to use this skill

- Any task that changes weather or AQI data fetching, caching, or normalization
- Any task that adds or modifies TanStack Query hooks for weather or AQI
- Any task that touches the snapshot persistence or fallback logic
- Any task that changes how the provider layer maps to app-facing models

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md) — query and persistence rules
- [docs/specs.md](../specs.md) — normalized weather and AQI model contracts
- The current files under `entities/weather/`, `entities/aqi/`, and `shared/api/`
- The current query hooks under `features/` or `shared/`

## Hard rules

- UI must consume only normalized app-facing models — raw provider response shapes must not appear in components or pages
- Core weather and AQI are separate normalized slices; do not merge them into one model
- TanStack Query is runtime cache only; do not persist the query cache across sessions
- Real provider implementation must remain replaceable behind the provider interface
- Main weather staleTime: 10 minutes
- AQI staleTime: 30 minutes
- Retry policy: once on failure
- Refetch on focus only when stale; do not refetch on every window focus
- Weather snapshot fallback cutoff: 24 hours — snapshots older than 24h must not be shown as current data
- AQI snapshot fallback cutoff: 12 hours
- Authoritative cutoff helpers: `frontend/features/app-bootstrap/snapshot-cutoff.ts` — `isWeatherSnapshotFresh` and `isAqiSnapshotFresh` are the single source of truth for these cutoffs; do not hardcode the values elsewhere

## Execution checklist

1. Intent: confirm the normalized model shape before touching fetch or display code.
   Action:
   - read the current normalized model types in `entities/weather/` and `entities/aqi/`
   - confirm the model does not expose raw provider field names
     Done-check: the app-facing model is clearly defined and does not mirror the raw provider response.

2. Intent: apply the correct stale and retry policy when adding or changing a query hook.
   Action:
   - set `staleTime: 10 * 60 * 1000` for main weather hooks
   - set `staleTime: 30 * 60 * 1000` for AQI hooks
   - set `retry: 1` on both
   - set `refetchOnWindowFocus: true` on both (TQ v5 removed `'if-stale'`; `true` is the equivalent — the library checks staleness before refetching when this is `true`)
     Done-check: the hook configuration matches all four policy values exactly.

3. Intent: confirm snapshot persistence respects the fallback cutoff.
   Action:
   - locate the snapshot read path in the repository
   - confirm the read logic checks timestamp age before returning a snapshot
   - confirm weather snapshots older than 24h and AQI snapshots older than 12h are treated as absent
     Done-check: stale snapshots are not silently returned as valid data.

4. Intent: confirm that provider adapters normalize before returning.
   Action:
   - read the provider adapter for weather (and AQI if changed)
   - confirm the adapter maps all provider-specific field names to the normalized model before returning
     Done-check: no raw provider field name appears beyond the adapter boundary.

## Verification

- `pnpm typecheck` to confirm the normalized model types are consistent across layers
- `pnpm exec vitest run` for the query hooks and snapshot read logic
- Confirm staleTime, retry, and refetchOnWindowFocus values have explicit tests or at least inline assertions

## Stop and ask Ori

- The normalized model shape needs to change in a way that affects multiple consumers
- The snapshot cutoff logic requires a behavior decision not covered by the current rule (e.g., partial staleness)
- The provider interface needs to change in a way that would break the existing adapter contract

## Portability note

Codex: use `rg` to locate model types and adapter files.
Claude Code: use the `Grep` tool for the same searches and the `Read` tool to inspect found files. The policy values and model contracts are identical for both agents.
