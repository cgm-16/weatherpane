# Weatherpane Issues Breakdown

This file maps the implementation plan into issue-sized units.  
Each issue maps 1:1 to a task prompt in `prompt.md`.

---

## Labeling suggestion

Apply:
- one `type:*`
- one or more `area:*`
- one `priority:*`
- `status:ready` once prerequisites are satisfied

---

## WP-001 — Bootstrap app shell and test harness
**Task:** `T01`  
**Type:** `type:feature`  
**Area:** `area:app-shell`, `area:testing`  
**Priority:** `priority:p0`  
**Depends on:** none

### Scope
- Vite React TS bootstrap
- Tailwind
- Router
- TanStack Query provider
- FSD folder layout
- Vitest + RTL
- Playwright setup
- base scripts

### Acceptance
- App boots
- Base routes render placeholders
- Build/lint/typecheck/tests pass

---

## WP-002 — Add env parsing and provider switching skeleton
**Task:** `T02`  
**Type:** `type:feature`  
**Area:** `area:weather`, `area:app-shell`  
**Priority:** `priority:p0`  
**Depends on:** `WP-001`

### Scope
- typed env parser
- mock vs real provider selection
- config error shape
- dev-toggle hook point

### Acceptance
- deterministic provider selection
- invalid config represented safely
- no provider logic leaked into UI

---

## WP-003 — Build Korea catalog preprocessing pipeline
**Task:** `T03`  
**Type:** `type:feature`  
**Area:** `area:search`, `area:assets`  
**Priority:** `priority:p0`  
**Depends on:** `WP-001`

### Scope
- parse raw district JSON
- normalize catalog entries
- stable catalog ids
- popular location canonical list
- generated artifact

### Acceptance
- runtime search uses generated artifact, not raw JSON
- script is deterministic and tested

---

## WP-004 — Implement domain types and storage repositories
**Task:** `T04`  
**Type:** `type:feature`  
**Area:** `area:storage`, `area:routing`  
**Priority:** `priority:p0`  
**Depends on:** `WP-001`

### Scope
- normalized location types
- favorites/recents/active/theme stores
- session temp-route store
- versioned safe parsing and reset

### Acceptance
- per-feature storage keys exist
- invalid schema resets safely
- repositories are test-covered

---

## WP-005 — Implement search normalization and ranking engine
**Task:** `T05`  
**Type:** `type:feature`  
**Area:** `area:search`  
**Priority:** `priority:p0`  
**Depends on:** `WP-003`, `WP-004`

### Scope
- normalization rules
- omitted suffix handling for common cases
- ranking order
- search result view models

### Acceptance
- exact leaf/segment and broader-before-descendant behavior works
- deterministic ordering is tested

---

## WP-006 — Build URL-backed Search page and keyboard model
**Task:** `T06`  
**Type:** `type:feature`  
**Area:** `area:search`, `area:routing`  
**Priority:** `priority:p0`  
**Depends on:** `WP-001`, `WP-005`

### Scope
- `/search?q=...`
- replace history while typing
- remove `q` when cleared
- result rendering
- keyboard navigation

### Acceptance
- direct open on `/search?q=...` hydrates immediately
- first result auto-highlights
- Enter selects highlighted result

---

## WP-007 — Implement location resolution and unsupported temp routes
**Task:** `T07`  
**Type:** `type:feature`  
**Area:** `area:search`, `area:routing`, `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-002`, `WP-003`, `WP-004`, `WP-005`

### Scope
- manual override first
- provider geocode second
- Korea filtering + best match
- resolved ids
- unsupported temp token + session recovery

### Acceptance
- successful selection can resolve cleanly
- unsupported selection gets recoverable temp route context

---

## WP-008 — Implement normalized weather and AQI provider adapters
**Task:** `T08`  
**Type:** `type:feature`  
**Area:** `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-002`, `WP-004`

### Scope
- normalized core weather model
- normalized AQI model
- mock provider fixtures
- condition bucket and text-mapping inputs

### Acceptance
- UI can consume app-facing models only
- AQI remains separate from core weather

---

## WP-009 — Add TanStack Query hooks and refresh helpers
**Task:** `T09`  
**Type:** `type:feature`  
**Area:** `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-008`

### Scope
- query keys
- query hooks
- stale/retry policies
- manual refresh helper

### Acceptance
- weather staleTime 10m
- AQI staleTime 30m
- manual refresh can refetch visible data

---

## WP-010 — Implement current-location service and geolocation recovery
**Task:** `T10`  
**Type:** `type:feature`  
**Area:** `area:weather`, `area:routing`  
**Priority:** `priority:p1`  
**Depends on:** `WP-003`, `WP-004`, `WP-007`, `WP-008`

### Scope
- getCurrentPosition
- 8-second timeout
- canonicalization preference by depth
- raw GPS fallback
- outside-Korea behavior
- recovery state model

### Acceptance
- supported, unsupported, raw GPS, timeout, and denial cases are distinguishable

---

## WP-011 — Implement startup bootstrap and active-location orchestration
**Task:** `T11`  
**Type:** `type:feature`  
**Area:** `area:app-shell`, `area:storage`, `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-004`, `WP-009`, `WP-010`

### Scope
- startup precedence
- active-location persistence
- snapshot cutoffs
- route-level state models

### Acceptance
- restore active location before current-location flow
- fallback/error decisions match spec

---

## WP-012 — Build Home compact dashboard
**Task:** `T12`  
**Type:** `type:feature`  
**Area:** `area:weather`, `area:app-shell`  
**Priority:** `priority:p1`  
**Depends on:** `WP-009`, `WP-011`

### Scope
- compact weather surface
- AQI + humidity
- 6-hour preview
- refresh UI
- detail CTA
- stale timestamp rules

### Acceptance
- Home is a real active-location dashboard
- refresh is inline and non-blocking

---

## WP-013 — Build Detail screen and route-state surfaces
**Task:** `T13`  
**Type:** `type:feature`  
**Area:** `area:weather`, `area:routing`  
**Priority:** `priority:p1`  
**Depends on:** `WP-009`, `WP-011`, `WP-012`

### Scope
- expanded weather surface
- 12-hour forecast
- AQI drawer
- UV drawer
- dew point
- unsupported/not-found/recoverable states

### Acceptance
- all detail route states render correctly
- route is recoverable and test-covered

---

## WP-014 — Wire search selection to detail and active location
**Task:** `T14`  
**Type:** `type:feature`  
**Area:** `area:search`, `area:routing`, `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-006`, `WP-007`, `WP-011`, `WP-013`

### Scope
- search selection success path
- unsupported path
- active-location update rules
- navigation completion

### Acceptance
- search is now a real product flow end to end

---

## WP-015 — Implement recents and Search default-state sections
**Task:** `T15`  
**Type:** `type:feature`  
**Area:** `area:search`, `area:storage`  
**Priority:** `priority:p1`  
**Depends on:** `WP-004`, `WP-006`, `WP-011`, `WP-014`

### Scope
- recents MRU
- current-location recents rules
- popular static section
- recents click flow

### Acceptance
- Search default state is complete and persistent

---

## WP-016 — Implement Favorites core actions and undo
**Task:** `T16`  
**Type:** `type:feature`  
**Area:** `area:favorites`, `area:storage`, `area:weather`  
**Priority:** `priority:p0`  
**Depends on:** `WP-004`, `WP-011`, `WP-012`, `WP-013`

### Scope
- add/remove from Home/Detail
- duplicate logic
- max 6 cap
- raw GPS disabled state
- undo latest only

### Acceptance
- save/unsave behavior is correct and recoverable

---

## WP-017 — Build Favorites page read mode and refresh queue
**Task:** `T17`  
**Type:** `type:feature`  
**Area:** `area:favorites`, `area:weather`  
**Priority:** `priority:p1`  
**Depends on:** `WP-009`, `WP-015`, `WP-016`

### Scope
- favorites page
- empty state
- card states
- card navigation
- background refresh queue

### Acceptance
- Favorites page is usable and resilient before edit mode exists

---

## WP-018 — Implement Favorites 편집/정렬 mode
**Task:** `T18`  
**Type:** `type:feature`  
**Area:** `area:favorites`, `area:a11y`  
**Priority:** `priority:p1`  
**Depends on:** `WP-016`, `WP-017`

### Scope
- management mode toggle
- nickname edit
- drag handle
- up/down fallback
- persist-on-drop

### Acceptance
- unified management mode works with accessible fallback controls

---

## WP-019 — Implement theme system and responsive chrome
**Task:** `T19`  
**Type:** `type:feature`  
**Area:** `area:theme`, `area:app-shell`, `area:a11y`  
**Priority:** `priority:p2`  
**Depends on:** `WP-001`, `WP-011`, `WP-012`, `WP-013`, `WP-017`

### Scope
- system-theme first load
- persisted override
- mobile/desktop chrome
- glass primitives
- reduced motion

### Acceptance
- shell is coherent across screens and breakpoints

---

## WP-020 — Implement sketch asset system
**Task:** `T20`  
**Type:** `type:feature`  
**Area:** `area:assets`  
**Priority:** `priority:p2`  
**Depends on:** `WP-003`, `WP-012`, `WP-013`, `WP-017`, `WP-019`

### Scope
- semantic keys
- baseline manifest
- remote override manifest
- selection logic
- local fallback loader

### Acceptance
- screens render assets through real manifest-driven logic

---

## WP-021 — Harden offline/config/recovery behavior
**Task:** `T21`  
**Type:** `type:feature`  
**Area:** `area:weather`, `area:app-shell`, `area:routing`  
**Priority:** `priority:p1`  
**Depends on:** `WP-011`, `WP-012`, `WP-013`, `WP-017`, `WP-020`

### Scope
- global config error
- offline banner
- online recovery
- stale/fallback unification

### Acceptance
- main resilience scenarios are explicit and deterministic

---

## WP-022 — Final smoke suite, demo mode, README, deployment docs
**Task:** `T22`  
**Type:** `type:test`, `type:docs`  
**Area:** `area:testing`, `area:docs`, `area:ci`  
**Priority:** `priority:p1`  
**Depends on:** `WP-014`, `WP-015`, `WP-017`, `WP-018`, `WP-019`, `WP-020`, `WP-021`

### Scope
- Playwright smoke suite
- screenshot/trace usefulness
- dev demo mode
- README and deploy docs
- final cleanup

### Acceptance
- another developer can run, test, and extend the project immediately
