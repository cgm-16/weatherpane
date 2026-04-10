## T12 — Build the Home compact dashboard

**Issue:** `WP-012`  
**Prerequisites:** `T09`, `T11`  
**Relevant skills:** `weather-domain-contracts`, `asset-manifest-contract`

```text
You are implementing T12 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/asset-manifest-contract.md

Goal:
Implement the compact Home dashboard for the active location.

Requirements:
- Home shows:
  - current temperature
  - curated condition copy
  - today min/max
  - 6-hour hourly preview
  - AQI summary
  - humidity
  - favorite action surface
  - manual refresh action
  - explicit 상세 보기 CTA
- Main summary card is tappable to Detail.
- Keep existing data visible during refresh with inline refreshing UI.
- Manual refresh failure should keep old data visible and show a non-blocking error.
- Show relative last-updated only when stale/offline/fallback-based.
- Relative last-updated must update every 1 minute when visible.
- Tapping/clicking relative last-updated reveals absolute time in the viewed location timezone.

Testing:
- RTL tests for Home content rendering from mock data.
- RTL tests for refresh behavior and non-blocking failure.
- RTL tests for stale/fallback last-updated visibility rules.
- Playwright test for Home loading happy path in mock mode.

Integration / wiring:
- Use the real active-location/query/bootstrap logic from previous tasks.
- Do not duplicate fetch logic inside the page.
- Keep the page working even before the sketch system is complete.

Definition of done:
- Home is a real, usable screen driven by active-location data.
```
