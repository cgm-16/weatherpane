## T15 — Implement Recents and Search default-state sections

**Issue:** `WP-015`  
**Prerequisites:** `T04`, `T06`, `T11`, `T14`  
**Relevant skills:** `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T15 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Implement recent locations as a visible feature and finish the Search page default state.

Requirements:
- Recents:
  - visible feature on Search
  - MRU ordering
  - successful opens move item to top
  - dedupe before reinsert
  - cap at 10
  - favorites and recents are independent
- Current location enters recents only on explicit actions:
  - manual refresh from Home
  - favorite action from Home
  - entering Detail
- Search default state with no active query shows:
  - Recent Locations first
  - Popular Locations second
- Popular Locations:
  - static curated list only
  - canonical internal paths, short labels in UI
- Tapping a recent location:
  - navigate to detail
  - set active location

Testing:
- Unit tests for MRU behavior.
- RTL tests for Search default state ordering.
- RTL tests for query state hiding recents/popular.
- RTL tests for current-location recents insertion rules.
- Playwright test for recents persistence across reload.

Integration / wiring:
- Use the real repositories from T04.
- Remove any placeholder recent/poular sections if present.

Definition of done:
- Search now has a complete default state and visible recent-history behavior.
```
