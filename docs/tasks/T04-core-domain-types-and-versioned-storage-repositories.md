## T04 — Implement core domain types and versioned storage repositories

**Issue:** `WP-004`  
**Prerequisites:** `T01`  
**Relevant skills:** `weather-domain-contracts`, `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T04 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Create the normalized domain types and explicit versioned storage repositories used by the rest of the app.

Requirements:
- Define domain types for:
  - catalog location
  - resolved location
  - raw GPS fallback location
  - active location
  - recent location
  - favorite location
  - persisted weather snapshot
  - persisted AQI snapshot
- Implement per-feature versioned storage keys for:
  - favorites
  - recents
  - active location
  - theme
  - optional snapshot stores if separated
- Implement safe parse / safe reset behavior for invalid or mismatched schema versions.
- Add sessionStorage support for temporary unsupported-route context.
- Keep repository APIs explicit and testable.

Testing:
- Unit test valid persistence round-trips.
- Unit test invalid schema discard/reset behavior.
- Unit test sessionStorage temp-route repository behavior.
- Unit test cutoff helpers are not yet needed here, but data models must accommodate timestamps.

Integration / wiring:
- Repositories should be importable and usable immediately.
- No UI yet; this task provides the state contract for later flows.

Definition of done:
- Future features can use stable repository interfaces without rethinking persistence.
```
