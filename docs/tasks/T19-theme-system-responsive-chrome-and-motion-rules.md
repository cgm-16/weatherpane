## T19 — Implement theme system, responsive chrome, and motion rules

**Issue:** `WP-019`  
**Prerequisites:** `T01`, `T11`, `T12`, `T13`, `T17`  
**Relevant skills:** `asset-manifest-contract`, `fsd-boundaries`

```text
You are implementing T19 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/asset-manifest-contract.md
- docs/skills/fsd-boundaries.md

Goal:
Implement the visual shell rules that make the app coherent on mobile and desktop.

Requirements:
- Theme behavior:
  - first visit follows system theme
  - later explicit user choice persists
- Add light/dark theme tokens for Haet-Ssal and Dal-Bit Night.
- Implement core glassmorphism container primitives and shared layout pieces.
- Mobile:
  - bottom nav
- Desktop:
  - sidebar navigation
- Keep route/page structure aligned across breakpoints.
- Honor prefers-reduced-motion by reducing/disabling non-essential animations.
- Do not overbuild visual polish; focus on stable reusable primitives.

Testing:
- RTL tests for theme restore behavior.
- RTL tests for system-theme default path where practical.
- Playwright smoke for theme persistence.
- Add at least one test ensuring reduced-motion class or behavior path is respected if feasible.

Integration / wiring:
- Apply the visual system to existing Home/Search/Favorites/Detail chrome.
- Avoid rewriting page logic while styling.

Definition of done:
- The app has a coherent shell and theme behavior across core screens.
```
