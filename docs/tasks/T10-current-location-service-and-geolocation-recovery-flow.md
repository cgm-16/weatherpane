## T10 — Implement current-location service and geolocation recovery flow

**Issue:** `WP-010`  
**Prerequisites:** `T03`, `T04`, `T07`, `T08`  
**Relevant skills:** `search-and-location-resolution`, `weather-domain-contracts`

```text
You are implementing T10 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the one-shot current-location service with timeout, canonicalization, and raw GPS fallback behavior.

Requirements:
- Use getCurrentPosition only.
- Use default browser accuracy behavior.
- Timeout at 8 seconds.
- If geolocation succeeds:
  - try to reverse-map to the most specific supported canonical Korea location (dong > gu/gun > si/do)
  - if canonicalization fails, create a raw GPS fallback location
- If location is outside Korea:
  - allow raw GPS fallback viewable state
  - do not allow favorite save unless later canonicalized
- If permission denied/unavailable/timeout:
  - expose a recovery state model
- Do not background-refresh current location silently once active location is restored from storage.

Testing:
- Unit test timeout behavior.
- Unit test canonicalization preference by depth.
- Unit test raw GPS fallback creation.
- Unit test outside-Korea non-favoritable raw GPS behavior.
- Unit test denied/unavailable recovery state model.

Integration / wiring:
- Expose a feature/service API that later screens/bootstrap logic can call.
- Do not wire full Home UI yet unless needed for integration.

Definition of done:
- Current-location flows are deterministic and ready for startup orchestration.
```
