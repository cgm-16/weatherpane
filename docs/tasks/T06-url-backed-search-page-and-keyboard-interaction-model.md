## T06 — Build the URL-backed Search page and keyboard interaction model

**Issue:** `WP-006`  
**Prerequisites:** `T01`, `T05`  
**Relevant skills:** `search-and-location-resolution`, `testing-and-mocks`

```text
You are implementing T06 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/testing-and-mocks.md

Goal:
Implement the Search page interaction model with `/search?q=...`, local filtering, result rendering, and keyboard navigation.

Requirements:
- Search input state must be driven by the URL query param `q`.
- Direct open and refresh on `/search?q=...` must hydrate input and results immediately.
- Clearing the input must remove `q` entirely.
- Replace browser history while typing.
- Do not push history entries on every keystroke.
- Hide recents/popular while an active query exists.
- Show only search results during active query.
- Limit initial visible result count to 8 before scroll.
- Keyboard behavior:
  - first result auto-highlighted when results exist
  - up/down changes highlight
  - Enter selects highlighted result
  - Esc clears active highlight or input state
- Show `검색 결과가 없습니다.` only for true no-match catalog state.

Testing:
- RTL tests for URL hydration.
- RTL tests for query clearing removing `q`.
- RTL tests for active query hiding default sections.
- RTL tests for keyboard highlight and Enter selection intent.
- Playwright test for direct-open `/search?q=...` showing hydrated results.

Integration / wiring:
- Use the real local search engine from T05.
- For now, selection can call a placeholder handler or navigate to a temporary stub if later tasks will finish resolution.
- Do not leave dead selection code; wire it to the best currently available route behavior.

Definition of done:
- Search page is genuinely usable with keyboard + URL-backed state.
```
