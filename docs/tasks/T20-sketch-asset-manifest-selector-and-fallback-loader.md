## T20 — Implement the sketch asset manifest, selector, and fallback loader

**Issue:** `WP-020`  
**Prerequisites:** `T03`, `T12`, `T13`, `T17`, `T19`  
**Relevant skills:** `asset-manifest-contract`

```text
You are implementing T20 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/asset-manifest-contract.md

Goal:
Implement the sketch asset system using semantic keys, bundled baseline manifest, remote override manifest, and deterministic local fallbacks.

Requirements:
- Semantic key based asset selection.
- Bundled baseline manifest.
- Optional remote manifest fetched in background and applied next app load only.
- Asset families:
  - major hubs with full 8-variant support contract
  - generic archetypes with reduced 6-variant support contract
- Implement selector logic inputs:
  - major hub inheritance for descendants
  - generic archetype mapping hooks
  - condition/daypart variant selection
  - generic missing-variant fallback rules:
    - cloudy-night -> clear-night
    - snowy-night -> rainy-night
- Remote asset failure -> immediate deterministic local fallback
- Use WebP URLs and preserve the agreed contract assumptions.
- It is acceptable to use placeholder/local sample assets until the real art library exists, but the loader/manifest system must be real.

Testing:
- Unit tests for semantic key selection.
- Unit tests for major-hub inheritance.
- Unit tests for generic fallback mapping.
- Unit tests for manifest precedence and next-load application behavior.
- RTL tests for image fallback behavior if practical.

Integration / wiring:
- Apply sketch surfaces to Home, Detail, and Favorite cards.
- Do not hardcode URLs in components.
- Keep asset logic isolated from screen layout logic.

Definition of done:
- The application can render sketch backgrounds/cards through a real manifest-driven loader.
```
