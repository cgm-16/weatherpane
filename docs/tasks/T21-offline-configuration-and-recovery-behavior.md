## T21 — Harden offline, configuration, and recovery behavior

**Issue:** `WP-021`  
**Prerequisites:** `T11`, `T12`, `T13`, `T17`, `T20`  
**Relevant skills:** `weather-domain-contracts`, `testing-and-mocks`

```text
You are implementing T21 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/testing-and-mocks.md

Goal:
Unify the final resilience behaviors: config errors, offline banner, online recovery, stale messaging, and route/card recovery surfaces.

Requirements:
- Global configuration error state for invalid/missing real API configuration.
- Offline behavior:
  - global offline banner
  - if usable snapshot exists, show stale/offline content
  - if no usable snapshot exists, show offline recoverable error state
- Coming back online:
  - dismiss banner automatically
  - refetch currently visible location data automatically
- Manual refresh:
  - refetch all visible location data
  - keep old data on screen while refreshing
  - non-blocking failure messaging
- Ensure state separation remains correct:
  - no search match
  - unsupported selected location
  - invalid route
  - recoverable data error
  - config error
  - offline stale fallback

Testing:
- RTL tests for global config error state.
- RTL tests for offline banner behavior.
- RTL/integration tests for offline snapshot fallback vs recoverable error.
- RTL/integration tests for online recovery refetch trigger.
- Playwright smoke or integration coverage for at least one offline/online scenario in mock mode.

Integration / wiring:
- Consolidate duplicated fallback/error logic if any exists.
- Do not break previously working flows.

Definition of done:
- The app behaves predictably under the main resilience scenarios.
```
