## T11 — Implement app bootstrap and active-location orchestration

**Issue:** `WP-011`  
**Prerequisites:** `T04`, `T09`, `T10`  
**Relevant skills:** `weather-domain-contracts`, `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T11 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Implement startup precedence, active-location restore, snapshot cutoff rules, and route-level recovery models.

Requirements:
- Startup precedence:
  1. restore valid persisted active location first
  2. if that fails, use current-location flow
- If restored active location has a usable snapshot and fresh fetch fails:
  - show the snapshot as stale fallback
- Weather snapshot hard cutoff: 24h
- AQI snapshot hard cutoff: 12h
- If no usable snapshot exists and main weather fetch fails:
  - show route-level recoverable error state
- Add app-level route state models for:
  - not found
  - unsupported
  - recoverable error
  - configuration error
- Keep active-location persistence explicit.

Testing:
- Unit/integration tests for startup precedence.
- Unit tests for snapshot cutoff helpers.
- Unit/integration tests for fallback-vs-error decisions.
- RTL tests for route-level recoverable state rendering if practical.

Integration / wiring:
- The app shell should now be capable of deciding what Home should show on startup.
- This task must not leave bootstrap logic scattered across pages.

Definition of done:
- Home can be driven by active-location orchestration rather than ad hoc screen logic.
```
