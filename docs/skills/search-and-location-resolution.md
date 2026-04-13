# Search And Location Resolution

## When to use this skill

- Search UI work
- Search state, ranking, or keyboard interaction work
- Location resolution, Korea filtering, or unsupported-route handling work

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/specs.md](../specs.md)
- [docs/prompt.md](../prompt.md)
- [docs/taskmap.md](../taskmap.md)
- current search and resolution files located with `rg -n "search|resolve|location|catalog" app docs tests`

## Hard rules

- Search source is the local preprocessed Korea catalog.
- Search normalization stays narrow and explicit:
  - NFC-normalize query text
  - fold whitespace and punctuation for matching
  - support omitted suffixes only for `시`, `도`, `구`, `군`, `읍`, `면`, `동`, `리`
  - do not broaden suffix stripping without an explicit spec decision
- Filtering is instant on every committed keystroke. During IME composition (`event.nativeEvent.isComposing === true`), do not call `updateQuery` — wait for the composition to end before updating URL state. This prevents decomposed jamo from appearing in the search input and URL mid-composition.
- The URL query is authoritative on `/search?q=...`.
- Replace history while typing.
- Push history only on explicit navigation.
- Unsupported selections do not become active location.
- Manual override table runs before provider geocoding.
- Provider geocoding runs before unsupported temp-route handling.
- The override table must stay easy to extend.
- Resolved route ids use `loc_<catalogLocationId>`.
- Unsupported temp-route ids use `unsupported::<catalogLocationId>`.

## Execution checklist

1. Intent: locate the current source of truth before editing.
   Action:
   - `rg -n "search|resolve|location|catalog" app docs tests`
   - read the files that own:
     - query state on `/search`
     - catalog filtering or ranking
     - location resolution and unsupported handling
       Done-check: the current owner files for search input, ranking, and resolution are identified.

2. Intent: preserve the URL-backed search contract.
   Action:
   - keep `/search?q=...` as the authoritative input state
   - use history replace while typing
   - remove `q` when the query is cleared
   - only push history on explicit navigation
     Done-check: a direct open on `/search?q=seoul` hydrates the same UI state as typing the value manually.

3. Intent: keep search deterministic and Korea-catalog-driven.
   Action:
   - read from the preprocessed local catalog, not a raw district file or provider-driven search endpoint
   - keep filtering local and immediate
     Done-check: the result list can be derived from local catalog data alone for a given query string.

4. Intent: preserve the resolution pipeline.
   Action:
   - apply manual overrides first
   - fall through to provider geocoding second
   - filter or classify unsupported results before changing active location
     Done-check: unsupported or out-of-scope selections never replace the active location.

5. Intent: verify the user-visible invariants for each change.
   Action:
   - add or update targeted tests for ranking, URL hydration, history behavior, and unsupported handling
   - run `pnpm exec vitest run path/to/search-behavior.test.ts`
   - run `pnpm exec playwright test path/to/search-flow.spec.ts` when the search flow changed
     Done-check: the changed behavior is covered by at least one targeted automated test or a clearly stated blocker.

6. Intent: confirm the search selection pipeline is wired end-to-end.
   Action:
   - confirm `useSearchSelection` is the sole owner of selection logic in `SearchPage` — no inline `selectResult`
   - confirm resolved path: `setActiveLocation` called before navigation, recents updated
   - confirm unsupported path: navigation only, no `setActiveLocation`, no recents write
   - confirm `useWeatherProvider().geocode` is injected into `createCatalogLocationResolver`
     Done-check: a direct click on a search result navigates to `/location/${catalogLocationId}` with active location set, or to `/location/unsupported::${id}` without.

## Verification

- direct-open `/search?q=...` hydration matches typed state
- clearing the query removes `q`
- typing uses history replace
- explicit navigation uses history push
- unsupported selections do not replace the active location
- `pnpm exec vitest run path/to/search-behavior.test.ts`
- `pnpm exec playwright test path/to/search-flow.spec.ts` when the search flow changed

## Stop and ask Ori

- a behavior choice would change the URL contract or active-location contract without an explicit product decision
- the existing ranking rules conflict with the written spec
- provider behavior suggests adding fallback search behavior that is not already specified

## Portability note

Codex: use `rg` for codebase searches and shell commands for file reading.
Claude Code: use the `Grep` tool for content searches, `Glob` for file pattern searches, and `Read` for file reading. The invariants and execution checklist logic are identical.
