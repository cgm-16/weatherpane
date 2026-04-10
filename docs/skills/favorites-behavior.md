# Favorites Behavior

## When to use this skill

- Any task that adds, removes, or modifies favorites logic, storage, or UI
- Any task that touches the Favorites page, card states, edit/sort mode, or undo behavior
- Any task that references the save/unsave action from Home or Detail

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/specs-favorites.md](../specs-favorites.md) — confirmed UX decisions (FAV-01 through FAV-12)
- [docs/specs.md](../specs.md) — Favorites screen state matrix
- The current feature files under `features/favorites/` and `entities/location/`

## Hard rules

- Favorites and Recents are independent; the same location may appear in both (FAV-01)
- Favorites max is 6; adding beyond 6 is blocked silently or with a cap UI, never a crash
- Favorites order is manual and persisted; do not sort alphabetically or by recency
- Reorder and nickname editing are only exposed in 편집/정렬 mode (FAV-08)
- Nickname max length is 20; hard-cap at input — do not allow exceeding 20 characters (FAV-11)
- Nickname is committed on blur, Enter, or when the user taps 완료 (FAV-10)
- Drag handle is the primary reorder affordance; `위로` / `아래로` buttons are the accessible fallback (FAV-07)
- Undo restores the exact previous favorites state including position and nickname (not just "re-adds") (FAV-09 area)
- Only the latest removal is undoable; undo clears when a new removal happens or after 5 seconds
- Removing a favorite does not affect the active location
- Raw GPS location cannot be added to Favorites
- Card skeleton: shown when no snapshot exists and data is loading (FAV-03)
- Card inline error: shown when no snapshot exists and initial fetch fails (FAV-04)
- 다시 시도 button must be present on the inline error state (FAV-05)
- Card is not navigable when in the inline error state (FAV-06)
- No queue-level retry on card refresh failure in the same pass (FAV-12)

## Execution checklist

1. Intent: confirm which confirmed UX decision (FAV-xx) governs the changed behavior.
   Action:
   - read [docs/specs-favorites.md](../specs-favorites.md) for the relevant FAV rule
   - if a change would alter a FAV rule, stop — do not proceed without explicit re-agreement
   Done-check: the relevant FAV rule is named; no silent drift from the confirmed decisions.

2. Intent: enforce the 6-favorite cap at the action layer, not the UI layer.
   Action:
   - locate the favorites store action that handles add
   - confirm it checks `favorites.length < 6` before adding
   - confirm the UI reflects the blocked state but the store is the authority
   Done-check: adding a 7th favorite is blocked at the store level with a clear return signal.

3. Intent: confirm edit mode gating is complete.
   Action:
   - confirm drag handle, up/down buttons, and nickname input are only rendered or enabled inside 편집/정렬 mode
   - confirm toggling out of edit mode commits any in-progress nickname edit before closing (auto-blur → commit → close)
   Done-check: none of the edit-mode controls are accessible outside edit mode.

4. Intent: verify card state rendering matches the three-state contract.
   Action:
   - confirm the card component renders skeleton when `snapshot === null && isLoading`
   - confirm the card component renders inline error + retry button when `snapshot === null && isError`
   - confirm the card is navigable only when snapshot data is available
   Done-check: all three states render distinctly; no state is silently swallowed.

5. Intent: confirm undo scope.
   Action:
   - confirm the undo store holds only one removal at a time
   - confirm the undo timer resets or clears when a new removal occurs
   - confirm undo restores the exact favorites array (not just appends)
   Done-check: undo is tested for position and nickname restoration, not just presence.

## Verification

- `pnpm exec vitest run` for the favorites store and card state logic
- Confirm the 6-cap, undo scope, and edit-mode gating each have a dedicated test
- Confirm card state tests cover all three variants (skeleton, inline error, navigable)

## Stop and ask Ori

- A FAV rule is ambiguous in context and implementing it would lock in a guess
- The spec and current code disagree on a FAV rule in a way that affects behavior
- A change to undo, ordering, or nickname behavior is not covered by any existing FAV rule

## Portability note

Codex: use `rg` to search for store and component files.
Claude Code: use the `Grep` tool for the same searches and the `Read` tool to read found files. The behavioral rules are identical for both agents.
