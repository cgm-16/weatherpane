## T02 — Add environment parsing and mock/demo provider switching skeleton

**Issue:** `WP-002`  
**Prerequisites:** `T01`  
**Relevant skills:** `weather-domain-contracts`, `testing-and-mocks`, `fsd-boundaries`

```text
You are implementing T02 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/testing-and-mocks.md
- docs/skills/fsd-boundaries.md

Goal:
Create the environment/config layer and a provider switch that can choose between mock/demo and real provider implementations.

Requirements:
- Add a typed config parser for env variables.
- Support a mode flag that selects:
  - mock/demo provider
  - real provider
- Add a dev-only mechanism placeholder for an in-app toggle, but do not build the full UI toggle yet.
- Expose provider selection through shared infrastructure, not directly in pages/components.
- Add a safe global config error shape that later screens can consume.
- Do not implement full real API calls yet; just define the selection boundary cleanly.

Testing:
- Unit test env parsing for valid and invalid configurations.
- Unit test provider selection behavior for mock vs real modes.
- Unit test config error generation for invalid/missing required values.

Integration / wiring:
- The app should still boot normally in mock mode.
- Invalid config should be representable without crashing the app shell.
- This task must not leak provider selection logic into UI components.

Definition of done:
- A future task can plug real provider adapters into the same interface without changing UI code.
- Mock/demo selection is deterministic and test-covered.
```
