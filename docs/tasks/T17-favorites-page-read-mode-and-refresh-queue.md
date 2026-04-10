## T17 — Build the Favorites page read mode and refresh queue

**Issue:** `WP-017`  
**Prerequisites:** `T09`, `T15`, `T16`  
**Relevant skills:** `favorites-behavior`, `weather-domain-contracts`

```text
You are implementing T17 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the Favorites page default/read mode, including card states and background refresh behavior.

Requirements:
- Favorites page read mode:
  - show saved cards
  - empty state with:
    - 장소 검색하기
    - 현재 위치 보기
- Favorite card content:
  - sketch placeholder space for now if needed
  - displayed name/nickname
  - current temperature
  - condition copy
  - today min/max
  - stale/last-updated indicator when needed
- Card states:
  - no snapshot + loading -> card skeleton
  - no snapshot + initial fetch fail -> inline card error with 다시 시도, not navigable
  - snapshot + refresh fail -> keep stale snapshot, still navigable
- Clicking a valid card:
  - navigate to detail
  - set active location
- Background refresh behavior:
  - refresh stale cards on mount/focus
  - stale threshold 10m
  - concurrency limit 2
  - continue queue when one card fails
  - no extra queue-level retry in same pass

Testing:
- RTL tests for empty state.
- RTL tests for skeleton, stale, and inline-error card states.
- RTL tests for card navigation.
- Unit tests for refresh queue concurrency and continuation on failure.
- Playwright test for favorites persistence and page rendering.

Integration / wiring:
- Use real favorites repositories and query hooks.
- Favorites page should be a usable screen even before edit/sort mode exists.

Definition of done:
- Favorites becomes a functional read surface with resilient loading behavior.
```
