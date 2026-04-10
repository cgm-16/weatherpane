## T07 — Implement location resolution pipeline and unsupported temp-route handling

**Issue:** `WP-007`  
**Prerequisites:** `T02`, `T03`, `T04`, `T05`  
**Relevant skills:** `search-and-location-resolution`, `weather-domain-contracts`

```text
You are implementing T07 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the pipeline that turns a selected catalog location into either a resolved location or an unsupported-location route token.

Requirements:
- Resolution order:
  1. manual override table lookup
  2. provider geocoding
- Filter provider geocoding results to Korea and best string match, then take the top result.
- Produce resolvedLocationId deterministically according to the agreed resolved ID strategy.
- Unsupported behavior:
  - create a temporary route token under `/location/:id`
  - token format should represent unsupported::<catalogLocationId> or equivalent
  - store unsupported temp-route context in sessionStorage
  - allow refresh recovery in the same session only
- Do not let unsupported selections become active location or recents.
- Keep the resolution logic independent from UI.

Testing:
- Unit test manual override precedence.
- Unit test geocode filtering and best-match selection.
- Unit test unsupported token creation and recovery from sessionStorage.
- Unit test that unsupported selections do not create resolved locations.

Integration / wiring:
- Provide an application-facing resolver service that later UI flows can call.
- Wire Search selection to this resolution boundary if reasonable in the current branch state.

Definition of done:
- A later task can navigate successfully from Search to either Detail or unsupported route without redesigning the pipeline.
```
