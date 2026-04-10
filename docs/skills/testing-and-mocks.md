# Testing and mocks

## Hard rules
- Use mocked API responses by default in tests
- Local demo mode may use mock provider
- Production must not silently fall back to demo data
- Unit/component: Vitest + RTL
- E2E smoke: Playwright

## Required smoke coverage
- current-location success/fallback
- search -> detail -> active location
- favorites add/remove/reorder + persistence
- theme persistence
- recents persistence
