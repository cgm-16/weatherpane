# Weatherpane Implementation Prompt Pack

This file is the **execution blueprint plus agent prompt pack** for implementing Weatherpane incrementally and safely.

It is designed to be split into task files by another agent.

---

## 1. Build blueprint

### 1.1 Primary objective

Build a production-quality MVP of **Weatherpane** as a client-rendered React + TypeScript + Tailwind application using:

- Vite
- React Router
- TanStack Query
- Feature-Sliced Design
- explicit LocalStorage/sessionStorage persistence
- OpenWeather-targeted provider abstraction
- mock/demo provider for local demo mode and deterministic testing

The build must preserve the agreed product rules:

- Korea-first search driven by a preprocessed `korea_districts.json`
- URL-backed search state
- active location model with startup restore
- current-location flow with geolocation timeout/fallback behavior
- supported/unsupported/not-found/config/offline state separation
- favorites with capped save count, manual order, unified management mode, undo
- recents as a visible MRU feature
- compact Home and expanded Detail
- sketch asset manifest + deterministic fallback system
- strict runtime-query vs explicit persistence boundaries
- strong unit/integration coverage plus Playwright smoke coverage

### 1.2 Architectural stance

This project should be built with the following architectural boundaries:

- **App shell** owns providers, routing, layout chrome, bootstrap orchestration.
- **Pages/widgets** compose screen UI from lower-level features/entities.
- **Features** own user actions and interaction logic:
  - search
  - favorites
  - theme
  - current-location
  - refresh
- **Entities** own normalized domain models:
  - location
  - weather
  - AQI
  - sketch asset selection
- **Shared** owns primitives:
  - API clients and provider interfaces
  - repositories/storage adapters
  - UI atoms
  - utility libraries
  - config/env parsing
- **TanStack Query is runtime cache only.**
- **Local persistence is explicit, versioned, and per-feature.**
- **Provider response shapes never leak directly into UI.**

### 1.3 Delivery strategy

The project should be implemented in this order:

1. bootstrap the repo, shell, tests, and provider boundaries
2. preprocess the Korea catalog and make local search deterministic
3. normalize the location/weather domain before building UI
4. implement routing and state recovery early
5. ship a working thin vertical slice: search -> resolve -> detail
6. add current location and active location orchestration
7. add favorites and recents persistence
8. add visual asset infrastructure after data/state flows are stable
9. harden offline/error/config/recovery behavior
10. finish with smoke tests, documentation, and deployment support

This ordering minimizes late-stage rewrites.

---

## 2. Chunking pass

### Chunk A — foundation and deterministic interfaces
Goal: create the app shell, test stack, config parsing, provider abstraction, and normalized storage/domain contracts.

Includes:
- repo bootstrap
- providers and router
- mock/demo mode skeleton
- storage contracts
- catalog preprocessing

### Chunk B — search and location resolution
Goal: make local search fully deterministic before weather UI complexity grows.

Includes:
- search normalization/ranking
- `/search?q=` URL state
- keyboard navigation
- resolution pipeline
- unsupported route token handling

### Chunk C — weather domain and active location flows
Goal: normalize weather/AQI models and bootstrap active/current location behavior.

Includes:
- normalized weather provider
- query hooks and policies
- current location service
- active location restore/bootstrap
- snapshot validity rules

### Chunk D — product screens and core flows
Goal: deliver the main user-visible product surface.

Includes:
- Home compact dashboard
- Detail expanded dashboard
- search selection -> detail wiring
- recents and popular sections

### Chunk E — favorites and management workflows
Goal: implement saved-location behavior safely and accessibly.

Includes:
- add/remove/undo/max-cap
- favorites page read mode
- background refresh queue
- unified edit/sort mode
- drag handle + up/down fallback

### Chunk F — visual system and resilience
Goal: add theme, sketch assets, offline/config behavior, and final testing/docs.

Includes:
- theme system
- glass/responsive polish
- sketch asset manifest/loader
- offline/config hardening
- Playwright smoke tests
- README and deployment docs

---

## 3. Atomic task pass

The chunks above are broken into **small atomic tasks** below. A task is considered atomic when:

- it has explicit prerequisites
- it produces an integrated, testable outcome
- it does not leave orphaned code behind
- it is small enough for strong testing
- it still moves the project forward materially

The project task IDs are `T01` through `T22`.

---

## 4. Task prompts

Each section below is intentionally self-contained so it can be split into its own task file.

---

## T01 — Bootstrap the app shell and test harness

**Issue:** `WP-001`  
**Prerequisites:** none  
**Relevant skills:** `branching-and-issues`, `fsd-boundaries`, `testing-and-mocks`, `github-flow-and-release`

```text
You are implementing T01 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/branching-and-issues.md
- docs/skills/fsd-boundaries.md
- docs/skills/testing-and-mocks.md
- docs/skills/github-flow-and-release.md

Goal:
Bootstrap a working Vite + React + TypeScript + Tailwind + React Router + TanStack Query application with Feature-Sliced Design directories and a real test harness.

Requirements:
- Use Vite with React + TypeScript.
- Add Tailwind and base global styles.
- Add React Router with placeholder routes:
  - /
  - /search
  - /favorites
  - /location/:resolvedLocationId
- Add TanStack Query provider in the app shell.
- Create FSD directory structure:
  - src/app
  - src/pages
  - src/widgets
  - src/features
  - src/entities
  - src/shared
- Add placeholder pages/components so the app runs and routes render.
- Add Vitest + React Testing Library setup.
- Add Playwright setup with a placeholder smoke test.
- Add npm scripts for:
  - dev
  - build
  - preview
  - test
  - test:unit
  - test:e2e
  - lint
  - typecheck
- Keep UI minimal; this task is about reliable structure, not product polish.

Testing:
- Add at least one RTL smoke test proving the router renders the expected page content for `/`.
- Add at least one Playwright test proving the app boots and the Home placeholder renders.
- Ensure lint/typecheck/test/build all pass.

Integration / wiring:
- The app must run end-to-end with placeholder screens.
- Do not leave unused experimental files.
- Route placeholders must be visible and navigable so later tasks can build on them.

Definition of done:
- Project boots locally.
- All base scripts work.
- Router + Query provider are wired.
- Test harness is present and green.
- FSD directories exist and are used.
```

---

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

---

## T03 — Build the Korea catalog preprocessing pipeline

**Issue:** `WP-003`  
**Prerequisites:** `T01`  
**Relevant skills:** `search-and-location-resolution`, `asset-manifest-contract`, `fsd-boundaries`

```text
You are implementing T03 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/asset-manifest-contract.md
- docs/skills/fsd-boundaries.md

Goal:
Preprocess the raw korea_districts.json file into a normalized catalog artifact used by the application.

Requirements:
- Consume the provided raw district file.
- Build a preprocessing script that outputs a normalized catalog artifact at build time.
- For each catalog entry, derive:
  - catalogLocationId
  - full canonical path
  - depth
  - hierarchy fields (siDo, siGunGu, eupMyeonDong where applicable)
  - leaf label
  - searchable normalized tokens
  - display metadata suitable for search result rendering
- Add support for a fixed curated popular-location list stored internally as canonical paths.
- Add hooks for archetype metadata and override tables, even if the full asset system is built later.
- Keep the output deterministic and versionable.

Testing:
- Unit test parsing of 1-depth, 2-depth, and 3-depth entries.
- Unit test catalogLocationId determinism.
- Unit test popular-location canonical path validation.
- Unit test that malformed or duplicate inputs fail clearly.

Integration / wiring:
- Produce a real generated artifact that can be imported by app code.
- Add a script command for catalog generation.
- Ensure the app can import the generated artifact without runtime transformation.

Definition of done:
- Later tasks can use the generated catalog directly.
- The raw JSON is no longer the runtime search source.
```

---

## T04 — Implement core domain types and versioned storage repositories

**Issue:** `WP-004`  
**Prerequisites:** `T01`  
**Relevant skills:** `weather-domain-contracts`, `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T04 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Create the normalized domain types and explicit versioned storage repositories used by the rest of the app.

Requirements:
- Define domain types for:
  - catalog location
  - resolved location
  - raw GPS fallback location
  - active location
  - recent location
  - favorite location
  - persisted weather snapshot
  - persisted AQI snapshot
- Implement per-feature versioned storage keys for:
  - favorites
  - recents
  - active location
  - theme
  - optional snapshot stores if separated
- Implement safe parse / safe reset behavior for invalid or mismatched schema versions.
- Add sessionStorage support for temporary unsupported-route context.
- Keep repository APIs explicit and testable.

Testing:
- Unit test valid persistence round-trips.
- Unit test invalid schema discard/reset behavior.
- Unit test sessionStorage temp-route repository behavior.
- Unit test cutoff helpers are not yet needed here, but data models must accommodate timestamps.

Integration / wiring:
- Repositories should be importable and usable immediately.
- No UI yet; this task provides the state contract for later flows.

Definition of done:
- Future features can use stable repository interfaces without rethinking persistence.
```

---

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

---

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

---

## T07 — Implement location resolution pipeline and unsupported temp-route handling

**Issue:** `WP-007`  
**Prerequisites:** `T02`, `T03`, `T04`, `T05`  
**Relevant skills:** `search-and-location-resolution`, `weather-domain-contracts`

```text
You are implementing T07 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the pipeline that turns a selected catalog location into either a resolved location or an unsupported-location route token.

Requirements:
- Resolution order:
  1. manual override table lookup
  2. provider geocoding
- Filter provider geocoding results to Korea and best string match, then take the top result.
- Produce resolvedLocationId deterministically according to the agreed resolved ID strategy.
- Unsupported behavior:
  - create a temporary route token under `/location/:id`
  - token format should represent unsupported::<catalogLocationId> or equivalent
  - store unsupported temp-route context in sessionStorage
  - allow refresh recovery in the same session only
- Do not let unsupported selections become active location or recents.
- Keep the resolution logic independent from UI.

Testing:
- Unit test manual override precedence.
- Unit test geocode filtering and best-match selection.
- Unit test unsupported token creation and recovery from sessionStorage.
- Unit test that unsupported selections do not create resolved locations.

Integration / wiring:
- Provide an application-facing resolver service that later UI flows can call.
- Wire Search selection to this resolution boundary if reasonable in the current branch state.

Definition of done:
- A later task can navigate successfully from Search to either Detail or unsupported route without redesigning the pipeline.
```

---

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

---

## T09 — Add TanStack Query hooks and refresh helpers

**Issue:** `WP-009`  
**Prerequisites:** `T08`  
**Relevant skills:** `weather-domain-contracts`

```text
You are implementing T09 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md

Goal:
Create the TanStack Query layer for core weather and AQI, including manual refresh helpers.

Requirements:
- Implement query hooks for:
  - core weather by resolved location
  - AQI by resolved location
- Query policies:
  - core weather staleTime 10m
  - AQI staleTime 30m
  - retry once
  - refetch on focus only when stale
- Do not persist query cache across sessions.
- Add a manual refresh helper that force-refetches all visible data for a location.
- Keep query keys stable and explicit.

Testing:
- Unit/integration tests for query hook behavior using mocked providers.
- Test staleTime/retry behavior where practical.
- Test manual refresh helper forcing both core weather and AQI refresh.

Integration / wiring:
- Expose hooks usable by Home, Detail, and Favorites cards.
- Keep screen code thin; query concerns belong here.

Definition of done:
- Screens can consume query hooks without implementing fetch policy logic themselves.
```

---

## T10 — Implement current-location service and geolocation recovery flow

**Issue:** `WP-010`  
**Prerequisites:** `T03`, `T04`, `T07`, `T08`  
**Relevant skills:** `search-and-location-resolution`, `weather-domain-contracts`

```text
You are implementing T10 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the one-shot current-location service with timeout, canonicalization, and raw GPS fallback behavior.

Requirements:
- Use getCurrentPosition only.
- Use default browser accuracy behavior.
- Timeout at 8 seconds.
- If geolocation succeeds:
  - try to reverse-map to the most specific supported canonical Korea location (dong > gu/gun > si/do)
  - if canonicalization fails, create a raw GPS fallback location
- If location is outside Korea:
  - allow raw GPS fallback viewable state
  - do not allow favorite save unless later canonicalized
- If permission denied/unavailable/timeout:
  - expose a recovery state model
- Do not background-refresh current location silently once active location is restored from storage.

Testing:
- Unit test timeout behavior.
- Unit test canonicalization preference by depth.
- Unit test raw GPS fallback creation.
- Unit test outside-Korea non-favoritable raw GPS behavior.
- Unit test denied/unavailable recovery state model.

Integration / wiring:
- Expose a feature/service API that later screens/bootstrap logic can call.
- Do not wire full Home UI yet unless needed for integration.

Definition of done:
- Current-location flows are deterministic and ready for startup orchestration.
```

---

## T11 — Implement app bootstrap and active-location orchestration

**Issue:** `WP-011`  
**Prerequisites:** `T04`, `T09`, `T10`  
**Relevant skills:** `weather-domain-contracts`, `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T11 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Implement startup precedence, active-location restore, snapshot cutoff rules, and route-level recovery models.

Requirements:
- Startup precedence:
  1. restore valid persisted active location first
  2. if that fails, use current-location flow
- If restored active location has a usable snapshot and fresh fetch fails:
  - show the snapshot as stale fallback
- Weather snapshot hard cutoff: 24h
- AQI snapshot hard cutoff: 12h
- If no usable snapshot exists and main weather fetch fails:
  - show route-level recoverable error state
- Add app-level route state models for:
  - not found
  - unsupported
  - recoverable error
  - configuration error
- Keep active-location persistence explicit.

Testing:
- Unit/integration tests for startup precedence.
- Unit tests for snapshot cutoff helpers.
- Unit/integration tests for fallback-vs-error decisions.
- RTL tests for route-level recoverable state rendering if practical.

Integration / wiring:
- The app shell should now be capable of deciding what Home should show on startup.
- This task must not leave bootstrap logic scattered across pages.

Definition of done:
- Home can be driven by active-location orchestration rather than ad hoc screen logic.
```

---

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

---

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

---

## T14 — Wire search selection to detail navigation and active-location updates

**Issue:** `WP-014`  
**Prerequisites:** `T06`, `T07`, `T11`, `T13`  
**Relevant skills:** `search-and-location-resolution`, `favorites-behavior`

```text
You are implementing T14 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/search-and-location-resolution.md
- docs/skills/favorites-behavior.md

Goal:
Complete the end-to-end flow from Search result selection to navigation, active-location updates, and recents insertion rules.

Requirements:
- Tapping a search result:
  - resolve the selected catalog location
  - navigate to the destination route
  - set active location only after successful resolution
- Unsupported selection:
  - navigate to unsupported temp route
  - do not set active location
  - do not add to recents
- Successful selection:
  - navigate to detail
  - update active location
  - allow later recents insertion logic to run
- Preserve URL-backed search state behavior.

Testing:
- RTL/integration tests for success path.
- RTL/integration tests for unsupported path.
- Playwright test for search -> detail navigation in mock mode.
- Playwright test for unsupported search selection in mock mode.

Integration / wiring:
- This task must complete a real vertical slice from Search to Detail.
- Remove any placeholder selection handlers left from earlier tasks.

Definition of done:
- Search is now a functional product flow, not a UI stub.
```

---

## T15 — Implement Recents and Search default-state sections

**Issue:** `WP-015`  
**Prerequisites:** `T04`, `T06`, `T11`, `T14`  
**Relevant skills:** `favorites-behavior`, `search-and-location-resolution`

```text
You are implementing T15 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md
- docs/skills/search-and-location-resolution.md

Goal:
Implement recent locations as a visible feature and finish the Search page default state.

Requirements:
- Recents:
  - visible feature on Search
  - MRU ordering
  - successful opens move item to top
  - dedupe before reinsert
  - cap at 10
  - favorites and recents are independent
- Current location enters recents only on explicit actions:
  - manual refresh from Home
  - favorite action from Home
  - entering Detail
- Search default state with no active query shows:
  - Recent Locations first
  - Popular Locations second
- Popular Locations:
  - static curated list only
  - canonical internal paths, short labels in UI
- Tapping a recent location:
  - navigate to detail
  - set active location

Testing:
- Unit tests for MRU behavior.
- RTL tests for Search default state ordering.
- RTL tests for query state hiding recents/popular.
- RTL tests for current-location recents insertion rules.
- Playwright test for recents persistence across reload.

Integration / wiring:
- Use the real repositories from T04.
- Remove any placeholder recent/poular sections if present.

Definition of done:
- Search now has a complete default state and visible recent-history behavior.
```

---

## T16 — Implement Favorites core actions and undo behavior

**Issue:** `WP-016`  
**Prerequisites:** `T04`, `T11`, `T12`, `T13`  
**Relevant skills:** `favorites-behavior`

```text
You are implementing T16 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md

Goal:
Implement add/remove favorite actions from Home and Detail, including duplicate rules, cap rules, raw-GPS restrictions, and undo.

Requirements:
- Favorite actions exist on Home and Detail.
- Duplicate rules:
  - same canonical path duplicates are blocked
  - effectively same resolved location duplicates are blocked
- Max favorites: 6
- If max reached, block add and show the agreed message.
- Raw GPS fallback outside supported Korea canonicalization:
  - show favorite control disabled
  - explanatory text present
- Removing a favorite:
  - immediate remove
  - latest-action undo only
  - undo timeout 5s
  - restore exact previous state including nickname and manual position
- Removing an active favorite must not unset active location.

Testing:
- Unit tests for duplicate detection.
- Unit tests for max-cap behavior.
- RTL tests for disabled raw-GPS favorite control.
- RTL tests for remove + undo.
- RTL tests for active-location preservation after removal.

Integration / wiring:
- Use real favorite repositories from T04.
- Keep Home/Detail UI consistent.
- Do not build the Favorites page yet unless needed for integration.

Definition of done:
- Users can truly save and unsave locations from the main product surfaces.
```

---

## T17 — Build the Favorites page read mode and refresh queue

**Issue:** `WP-017`  
**Prerequisites:** `T09`, `T15`, `T16`  
**Relevant skills:** `favorites-behavior`, `weather-domain-contracts`

```text
You are implementing T17 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/favorites-behavior.md
- docs/skills/weather-domain-contracts.md

Goal:
Implement the Favorites page default/read mode, including card states and background refresh behavior.

Requirements:
- Favorites page read mode:
  - show saved cards
  - empty state with:
    - 장소 검색하기
    - 현재 위치 보기
- Favorite card content:
  - sketch placeholder space for now if needed
  - displayed name/nickname
  - current temperature
  - condition copy
  - today min/max
  - stale/last-updated indicator when needed
- Card states:
  - no snapshot + loading -> card skeleton
  - no snapshot + initial fetch fail -> inline card error with 다시 시도, not navigable
  - snapshot + refresh fail -> keep stale snapshot, still navigable
- Clicking a valid card:
  - navigate to detail
  - set active location
- Background refresh behavior:
  - refresh stale cards on mount/focus
  - stale threshold 10m
  - concurrency limit 2
  - continue queue when one card fails
  - no extra queue-level retry in same pass

Testing:
- RTL tests for empty state.
- RTL tests for skeleton, stale, and inline-error card states.
- RTL tests for card navigation.
- Unit tests for refresh queue concurrency and continuation on failure.
- Playwright test for favorites persistence and page rendering.

Integration / wiring:
- Use real favorites repositories and query hooks.
- Favorites page should be a usable screen even before edit/sort mode exists.

Definition of done:
- Favorites becomes a functional read surface with resilient loading behavior.
```

---

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

---

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

---

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

---

## T21 — Harden offline, configuration, and recovery behavior

**Issue:** `WP-021`  
**Prerequisites:** `T11`, `T12`, `T13`, `T17`, `T20`  
**Relevant skills:** `weather-domain-contracts`, `testing-and-mocks`

```text
You are implementing T21 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/weather-domain-contracts.md
- docs/skills/testing-and-mocks.md

Goal:
Unify the final resilience behaviors: config errors, offline banner, online recovery, stale messaging, and route/card recovery surfaces.

Requirements:
- Global configuration error state for invalid/missing real API configuration.
- Offline behavior:
  - global offline banner
  - if usable snapshot exists, show stale/offline content
  - if no usable snapshot exists, show offline recoverable error state
- Coming back online:
  - dismiss banner automatically
  - refetch currently visible location data automatically
- Manual refresh:
  - refetch all visible location data
  - keep old data on screen while refreshing
  - non-blocking failure messaging
- Ensure state separation remains correct:
  - no search match
  - unsupported selected location
  - invalid route
  - recoverable data error
  - config error
  - offline stale fallback

Testing:
- RTL tests for global config error state.
- RTL tests for offline banner behavior.
- RTL/integration tests for offline snapshot fallback vs recoverable error.
- RTL/integration tests for online recovery refetch trigger.
- Playwright smoke or integration coverage for at least one offline/online scenario in mock mode.

Integration / wiring:
- Consolidate duplicated fallback/error logic if any exists.
- Do not break previously working flows.

Definition of done:
- The app behaves predictably under the main resilience scenarios.
```

---

## T22 — Finalize end-to-end smoke coverage, demo mode, README, and deployment docs

**Issue:** `WP-022`  
**Prerequisites:** `T14`, `T15`, `T17`, `T18`, `T19`, `T20`, `T21`  
**Relevant skills:** `testing-and-mocks`, `github-flow-and-release`

```text
You are implementing T22 for Weatherpane.

Read before coding:
- AGENTS.md
- docs/skills/testing-and-mocks.md
- docs/skills/github-flow-and-release.md

Goal:
Finish the project with deterministic smoke coverage, dev demo support, and developer/submission documentation.

Requirements:
- Playwright smoke suite must cover:
  1. first visit current-location success/fallback
  2. search -> detail -> active location
  3. favorites add/remove/reorder + persistence
  4. theme persistence
  5. recents persistence
- Prefer mocked API responses in tests and local demo mode.
- Implement the dev-only in-app mock/demo toggle if not already present, but ensure production does not silently fall back to demo.
- Add/update README with:
  - project setup
  - env configuration
  - mock vs real provider mode
  - test commands
  - build/deploy steps
  - architecture summary
  - key technical decisions
- Add docs for asset manifest expectations and current limitations.
- Ensure production behavior on missing/invalid config is explicit error state, not demo fallback.

Testing:
- Complete the Playwright smoke suite.
- Ensure screenshots/traces are produced usefully for debugging.
- Verify lint, typecheck, build, unit tests, and e2e all pass.

Integration / wiring:
- Remove outdated placeholder text and stale docs.
- The project should now be usable by a developer immediately.

Definition of done:
- The repo is implementation-complete for MVP scope and can be handed off cleanly.
```

---

## 5. Final sequencing notes

### Critical implementation principles

- Never skip ahead to visual polish before domain/state flows are stable.
- Never let provider response shapes leak into screen components.
- Never persist TanStack Query cache.
- Always integrate at the end of a task; no orphan helper code.
- Prefer mock-mode determinism first, then wire real provider boundaries second.
- Every task should leave the app in a runnable state.

### Suggested execution order

Recommended linear order for lowest risk:

`T01 -> T02 -> T03 -> T04 -> T05 -> T06 -> T07 -> T08 -> T09 -> T10 -> T11 -> T12 -> T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21 -> T22`

### Suggested parallel opportunities

Safe parallel windows after prerequisites are satisfied:

- `T03` and `T04` can proceed after `T01`
- `T08` can proceed after `T02` + `T04`, in parallel with late search UI work
- `T19` can begin once core screens exist
- `T20` can begin once screen structures are stable
- `T22` should stay last

---

## 6. Use instructions

Another agent can split this file into one task file per `Txx` section.

Each task file should preserve:

- issue id
- prerequisites
- relevant skills
- prompt body
- definition of done
