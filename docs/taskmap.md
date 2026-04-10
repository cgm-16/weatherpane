# Weatherpane Task Map

This file describes the task DAG, critical routes, and suggested execution waves.

---

## 1. Task inventory

| Task | Issue | Title |
|---|---|---|
| T01 | WP-001 | Bootstrap app shell and test harness |
| T02 | WP-002 | Env parsing and provider switching skeleton |
| T03 | WP-003 | Korea catalog preprocessing pipeline |
| T04 | WP-004 | Domain types and storage repositories |
| T05 | WP-005 | Search normalization and ranking engine |
| T06 | WP-006 | URL-backed Search page and keyboard model |
| T07 | WP-007 | Location resolution and unsupported temp routes |
| T08 | WP-008 | Normalized weather and AQI provider adapters |
| T09 | WP-009 | Query hooks and refresh helpers |
| T10 | WP-010 | Current-location service and geolocation recovery |
| T11 | WP-011 | App bootstrap and active-location orchestration |
| T12 | WP-012 | Home compact dashboard |
| T13 | WP-013 | Detail screen and route-state surfaces |
| T14 | WP-014 | Search selection to Detail and active location |
| T15 | WP-015 | Recents and Search default-state sections |
| T16 | WP-016 | Favorites core actions and undo |
| T17 | WP-017 | Favorites page read mode and refresh queue |
| T18 | WP-018 | Favorites 편집/정렬 mode |
| T19 | WP-019 | Theme system and responsive chrome |
| T20 | WP-020 | Sketch asset system |
| T21 | WP-021 | Offline/config/recovery hardening |
| T22 | WP-022 | Smoke suite, demo mode, README, deploy docs |

---

## 2. DAG adjacency list

```text
T01 -> T02, T03, T04
T02 -> T07, T08
T03 -> T05, T07, T10, T20
T04 -> T05, T07, T08, T11, T15, T16
T05 -> T06, T07
T06 -> T14, T15
T07 -> T10, T14
T08 -> T09, T10
T09 -> T11, T12, T13, T17
T10 -> T11
T11 -> T12, T13, T14, T15, T16, T19, T21
T12 -> T13, T16, T19, T20, T21
T13 -> T14, T16, T19, T20, T21
T14 -> T15, T22
T15 -> T17, T22
T16 -> T17, T18
T17 -> T18, T19, T20, T21, T22
T18 -> T22
T19 -> T20, T22
T20 -> T21, T22
T21 -> T22
```

---

## 3. Critical routes

There are several near-critical routes, but the most important one is:

```text
T01
-> T04
-> T08
-> T09
-> T10
-> T11
-> T12
-> T13
-> T14
-> T15
-> T16
-> T17
-> T18
-> T21
-> T22
```

Why this is critical:
- it creates the shortest path to a fully functioning product loop
- it covers bootstrap, data normalization, active location, screens, recents, favorites, and resilience
- if this path is blocked, the product does not become meaningfully usable

Secondary critical/supporting routes:

### Search/data route
```text
T01 -> T03 -> T05 -> T06 -> T07 -> T14
```

### Asset route
```text
T01 -> T03 -> T19 -> T20
```

### Testing/ship route
```text
T01 -> T22
```
This is not directly executable until many dependencies complete, but it is the final convergence path.

---

## 4. Suggested execution waves

These waves are designed to maximize safe parallelism while minimizing merge pain.

### Wave 0 — bootstrap
Tasks:
- T01

Outcome:
- app runs
- tests exist
- repo is ready for incremental implementation

---

### Wave 1 — deterministic foundations
Tasks:
- T02
- T03
- T04

Outcome:
- config boundary
- generated Korea catalog
- normalized storage/domain contracts

These three tasks are good early parallel work once T01 is done.

---

### Wave 2 — search and provider domain
Tasks:
- T05
- T08

Outcome:
- deterministic local search engine
- normalized weather/AQI provider layer

These can run in parallel after their prerequisites.

---

### Wave 3 — interaction and resolution
Tasks:
- T06
- T07
- T09

Outcome:
- real Search page behavior
- real location resolution pipeline
- real query hooks

This is the point where the product starts turning into a usable vertical slice.

---

### Wave 4 — active location and main screens
Tasks:
- T10
- T11
- T12
- T13

Outcome:
- current location
- startup restore
- Home and Detail as real screens

Do not skip T11; it is the orchestration backbone.

---

### Wave 5 — user flows and persistence surfaces
Tasks:
- T14
- T15
- T16

Outcome:
- search -> detail vertical slice completed
- recents visible
- save/unsave behavior works

This is the first strong product-complete feeling wave.

---

### Wave 6 — saved-location experience
Tasks:
- T17
- T18

Outcome:
- Favorites page read mode
- refresh queue
- edit/sort mode
- accessible reorder fallback

---

### Wave 7 — shell polish and visual system
Tasks:
- T19
- T20

Outcome:
- coherent responsive shell
- theme persistence
- manifest-driven sketch system

These should be delayed until data/state flows are already stable.

---

### Wave 8 — resilience and release
Tasks:
- T21
- T22

Outcome:
- offline/config/recovery hardening
- final smoke coverage
- demo mode
- documentation and deploy readiness

---

## 5. Blocker rules

A task is blocked if any prerequisite is incomplete.

Key blocker notes:

- T06 is blocked on T05 because Search page behavior must not invent ranking rules itself.
- T11 is blocked on T09 and T10 because bootstrap must orchestrate real location/query logic.
- T14 is blocked on T13 because Search selection must land on a real route surface.
- T17 is blocked on T16 because the Favorites page is meaningless without save semantics.
- T20 is blocked on screen stability; implementing asset systems too early creates churn.
- T22 should remain last. It is convergence, not early exploration.

---

## 6. Suggested issue ordering for GitLab-style flow

Recommended issue opening order:

### Open immediately
- WP-001
- WP-002
- WP-003
- WP-004

### Open after wave 1 starts settling
- WP-005
- WP-006
- WP-007
- WP-008
- WP-009

### Open after vertical-slice path is visible
- WP-010
- WP-011
- WP-012
- WP-013
- WP-014
- WP-015
- WP-016

### Open once saved-location flows are live
- WP-017
- WP-018
- WP-019
- WP-020
- WP-021
- WP-022

This keeps the working queue focused without opening too many near-future issues too early.

---

## 7. Safety guidance

### Small enough
Each task is small enough to:
- be built with strong tests
- leave the app runnable
- avoid giant multi-system rewrites

### Large enough
Each task is still large enough to:
- integrate into the running app
- unlock downstream work
- avoid useless scaffolding branches

### Tasks that must not be merged half-finished
- T07
- T11
- T14
- T16
- T17
- T21

These tasks alter central flow rules and should not land with placeholder behavior.

---

## 8. Final recommendation

If only one linear path is used, follow:

```text
T01
T02
T03
T04
T05
T06
T07
T08
T09
T10
T11
T12
T13
T14
T15
T16
T17
T18
T19
T20
T21
T22
```

If moderate parallelism is allowed, use the wave plan above.
