## T16 — Implement Favorites core actions and undo behavior

**Issue:** `WP-016`  
**Prerequisites:** `T04`, `T11`, `T12`, `T13`  
**Relevant skills:** `favorites-behavior`

```text
You are implementing T16 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md

Goal:
Implement add/remove favorite actions from Home and Detail, including duplicate rules, cap rules, raw-GPS restrictions, and undo.

Requirements:
- Favorite actions exist on Home and Detail.
- Duplicate rules:
  - same canonical path duplicates are blocked
  - effectively same resolved location duplicates are blocked
- Max favorites: 6
- If max reached, block add and show the agreed message.
- Raw GPS fallback outside supported Korea canonicalization:
  - show favorite control disabled
  - explanatory text present
- Removing a favorite:
  - immediate remove
  - latest-action undo only
  - undo timeout 5s
  - restore exact previous state including nickname and manual position
- Removing an active favorite must not unset active location.

Testing:
- Unit tests for duplicate detection.
- Unit tests for max-cap behavior.
- RTL tests for disabled raw-GPS favorite control.
- RTL tests for remove + undo.
- RTL tests for active-location preservation after removal.

Integration / wiring:
- Use real favorite repositories from T04.
- Keep Home/Detail UI consistent.
- Do not build the Favorites page yet unless needed for integration.

Definition of done:
- Users can truly save and unsave locations from the main product surfaces.
```
