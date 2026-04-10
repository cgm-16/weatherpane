# Weather domain contracts

## Hard rules
- UI consumes normalized app-facing models
- Core weather is aggregated
- AQI remains a separate slice
- TanStack Query is runtime cache only
- Do not persist query cache across sessions
- Real provider implementation must remain replaceable

## Query policy
- main weather staleTime: 10m
- AQI staleTime: 30m
- retry once
- refetch on focus only when stale

## Snapshot policy
- weather snapshot fallback cutoff: 24h
- AQI snapshot fallback cutoff: 12h
