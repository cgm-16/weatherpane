## T09 — Add TanStack Query hooks and refresh helpers

**Issue:** `WP-009`  
**Prerequisites:** `T08`  
**Relevant skills:** `weather-domain-contracts`

```text
You are implementing T09 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md

Goal:
Create the TanStack Query layer for core weather and AQI, including manual refresh helpers.

Requirements:
- Implement query hooks for:
  - core weather by resolved location
  - AQI by resolved location
- Query policies:
  - core weather staleTime 10m
  - AQI staleTime 30m
  - retry once
  - refetch on focus only when stale
- Do not persist query cache across sessions.
- Add a manual refresh helper that force-refetches all visible data for a location.
- Keep query keys stable and explicit.

Testing:
- Unit/integration tests for query hook behavior using mocked providers.
- Test staleTime/retry behavior where practical.
- Test manual refresh helper forcing both core weather and AQI refresh.

Integration / wiring:
- Expose hooks usable by Home, Detail, and Favorites cards.
- Keep screen code thin; query concerns belong here.

Definition of done:
- Screens can consume query hooks without implementing fetch policy logic themselves.
```
