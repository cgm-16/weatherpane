## T05 — Implement search normalization and ranking engine

**Issue:** `WP-005`  
**Prerequisites:** `T03`, `T04`  
**Relevant skills:** `search-and-location-resolution`

```text
You are implementing T05 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md

Goal:
Build the pure local search engine used for Korean location lookup.

Requirements:
- Search over the generated catalog artifact only.
- Support practical normalization:
  - spacing/punctuation normalization
  - common suffix omission support for common cases only
- Ranking rules:
  1. exact leaf match
  2. exact segment match
  3. broader administrative unit before more specific descendants
  4. substring/full-path match
- Return search result models suitable for UI:
  - primary label
  - secondary path
  - catalogLocationId
  - full canonical path
- Enforce deterministic ordering.

Testing:
- Unit test exact leaf matching.
- Unit test exact segment matching.
- Unit test omitted suffix handling for common cases only.
- Unit test broader-before-descendant ranking behavior.
- Unit test repeated names across different parents.
- Unit test empty query behavior separately if helpful, but the UI default state is handled later.

Integration / wiring:
- Export a clean search service or pure utilities.
- Keep it framework-agnostic and UI-agnostic.

Definition of done:
- Search behavior is reliable and ready to be wired into the Search page.
```
