## T08 — Implement normalized weather and AQI provider adapters

**Issue:** `WP-008`  
**Prerequisites:** `T02`, `T04`  
**Relevant skills:** `weather-domain-contracts`, `testing-and-mocks`

```text
You are implementing T08 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/testing-and-mocks.md

Goal:
Implement normalized provider adapters for core weather and AQI, with mock fixtures as the first reliable execution path.

Requirements:
- Implement normalized provider contracts for:
  - core weather (current, min/max, 12h-ready hourly data, secondary metrics)
  - AQI (summary + pollutant detail model)
- Map provider responses into app-facing models.
- Keep AQI separate from core weather.
- Implement mock provider adapters and fixtures first.
- Add hooks/placeholders for the real OpenWeather-targeted adapter, even if some calls remain stubbed until later.
- Include weather text mapping inputs and visual bucket mapping inputs, but do not build UI here.

Testing:
- Unit test core weather normalization from fixture payloads.
- Unit test AQI normalization from fixture payloads.
- Unit test weather condition bucket mapping:
  - visual buckets: clear/cloudy/rainy/snowy
  - richer text mapping input shapes
- Unit test failure/error normalization.

Integration / wiring:
- The app code should be able to request normalized weather/AQI without knowing provider response details.
- Use mock provider as the default deterministic path.

Definition of done:
- Normalized domain models are ready for query hooks and screens.
```
