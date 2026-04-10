## T14 — Wire search selection to detail navigation and active-location updates

**Issue:** `WP-014`  
**Prerequisites:** `T06`, `T07`, `T11`, `T13`  
**Relevant skills:** `search-and-location-resolution`, `favorites-behavior`

```text
You are implementing T14 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/favorites-behavior.md

Goal:
Complete the end-to-end flow from Search result selection to navigation, active-location updates, and recents insertion rules.

Requirements:
- Tapping a search result:
  - resolve the selected catalog location
  - navigate to the destination route
  - set active location only after successful resolution
- Unsupported selection:
  - navigate to unsupported temp route
  - do not set active location
  - do not add to recents
- Successful selection:
  - navigate to detail
  - update active location
  - allow later recents insertion logic to run
- Preserve URL-backed search state behavior.

Testing:
- RTL/integration tests for success path.
- RTL/integration tests for unsupported path.
- Playwright test for search -> detail navigation in mock mode.
- Playwright test for unsupported search selection in mock mode.

Integration / wiring:
- This task must complete a real vertical slice from Search to Detail.
- Remove any placeholder selection handlers left from earlier tasks.

Definition of done:
- Search is now a functional product flow, not a UI stub.
```
