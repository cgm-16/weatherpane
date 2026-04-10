## T13 — Build the Detail screen and route-state surfaces

**Issue:** `WP-013`  
**Prerequisites:** `T09`, `T11`, `T12`  
**Relevant skills:** `weather-domain-contracts`, `search-and-location-resolution`

```text
You are implementing T13 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/search-and-location-resolution.md

Goal:
Implement the expanded Detail route for a viewed location, including state surfaces.

Requirements:
- Detail shows:
  - current temperature
  - curated condition copy
  - today min/max
  - 12-hour hourly forecast
  - AQI card + pollutant detail drawer
  - UV card + detail drawer
  - humidity
  - dew point
  - manual refresh
  - favorite action
- Route `/location/:resolvedLocationId` must handle:
  - valid resolved location
  - unsupported temp token
  - stale/invalid route -> not-found
  - recoverable error when no usable snapshot and main fetch fails
- Unsupported route state must include CTAs:
  - 검색으로 돌아가기
  - 현재 위치로 돌아가기
  - 홈으로
- Recoverable error state must include:
  - 다시 시도
  - 검색하기
  - 현재 위치로 돌아가기

Testing:
- RTL tests for Detail happy path.
- RTL tests for unsupported route rendering.
- RTL tests for invalid route not-found rendering.
- RTL tests for recoverable error rendering.
- Playwright test for a valid location detail route in mock mode.

Integration / wiring:
- Detail must use the same domain/query models as Home.
- Do not create duplicate weather state models just for this page.

Definition of done:
- Detail becomes the canonical route-driven location page.
```
