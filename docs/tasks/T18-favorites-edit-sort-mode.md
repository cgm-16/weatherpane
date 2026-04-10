## T18 — Implement Favorites 편집/정렬 mode

**Issue:** `WP-018`  
**Prerequisites:** `T16`, `T17`  
**Relevant skills:** `favorites-behavior`, `testing-and-mocks`

```text
You are implementing T18 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md
- docs/skills/testing-and-mocks.md

Goal:
Implement the unified Favorites management mode for nickname editing and ordering.

Requirements:
- Default Favorites view remains clean/read-oriented.
- Single toggle:
  - 편집 to enter
  - 완료 to exit
- Inside 편집/정렬 mode:
  - nickname editing available
  - drag handle visible
  - 위로 / 아래로 fallback controls visible
- Nickname behavior:
  - optional
  - trim whitespace
  - fallback to canonical name if empty after trim
  - duplicate nicknames allowed
  - hard cap at 20 chars
  - commit on blur / Enter / 완료
- Reordering:
  - drag handle only for pointer/touch
  - up/down fallback for accessibility
  - persist order only on drop
- Tapping 완료 while a nickname field is active:
  - blur
  - commit
  - exit mode

Testing:
- RTL tests for entering/exiting management mode.
- RTL tests for nickname commit rules.
- RTL tests for 20-char hard cap.
- RTL/integration tests for up/down reorder controls.
- If drag-and-drop is implemented with a library, test the persistence logic separately from the library mechanics.

Integration / wiring:
- Reuse existing favorites data and page structure.
- Do not create a separate rename mode or separate reorder mode.

Definition of done:
- Favorites management is complete and accessible without full keyboard drag semantics.
```
