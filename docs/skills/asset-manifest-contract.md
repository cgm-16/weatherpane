# Asset and Manifest Contract

## When to use this skill

- Any task that adds, changes, or removes weather condition sketch assets
- Any task that touches the asset manifest, manifest loader, or key-resolution logic
- Any task that changes how the remote manifest override is fetched or applied
- Any task that adds a new weather condition or time-of-day variant requiring an asset key

## Inputs to inspect first

- [AGENTS.md](../../AGENTS.md)
- [docs/specs.md](../specs.md) — asset system specification (WP-020 scope)
- The current files under `entities/asset/` or `shared/assets/`
- The baseline manifest file (bundled with the app)

## Hard rules

- App code must use semantic asset keys only — never hardcoded URLs or filenames
- The manifest resolves semantic keys to URLs; this mapping is the single source of truth
- A baseline manifest must be bundled with the app and must cover all semantic keys
- The remote override manifest, if fetched, applies only on the next app load — never mid-session
- Remote asset fetch failure must fall back to the deterministic local asset immediately
- No mid-session manifest hot swap; the resolved manifest is fixed for the session lifetime
- Master asset ratio: 3:2; master size: 2400×1600; format: WebP; max target size: 400 KB
- Safe zone: left 40%; top 15% and bottom 20% are low-detail safety margins; subject is right-weighted

## Execution checklist

1. Intent: confirm that new assets use semantic keys, not literal paths.
   Action:
   - identify the semantic key for the new condition (e.g., `clear-day`, `rain-night`)
   - add the key to the key type definition before adding assets
   - confirm no component imports an asset path directly
   Done-check: the new asset is referenced only by its semantic key throughout app code.

2. Intent: update the baseline manifest when adding a new key.
   Action:
   - add the new key and its bundled asset URL to the baseline manifest file
   - confirm all existing keys remain present and unchanged
   Done-check: the baseline manifest covers every semantic key defined in the type.

3. Intent: confirm the remote override path does not bypass the fallback contract.
   Action:
   - locate the manifest loader
   - confirm it merges remote keys over baseline keys (override) rather than replacing the entire manifest
   - confirm that if the remote fetch fails, the baseline manifest is used in full
   Done-check: a remote fetch failure results in a fully functional session using baseline assets.

4. Intent: verify asset dimensions and format before adding new files.
   Action:
   - confirm the asset is WebP, 2400×1600, under 400 KB
   - confirm the subject is right-weighted with left-40% safe zone and top/bottom safety margins respected
   Done-check: the asset passes the format and composition contract before being added to the manifest.

## Verification

- `pnpm exec vitest run` for the manifest loader and key-resolution logic
- Confirm the fallback path is tested: simulate remote fetch failure and verify baseline assets render
- Confirm no component test imports an asset by path rather than by semantic key

## Stop and ask Ori

- A new weather condition requires a semantic key that doesn't fit the existing key taxonomy
- The remote manifest schema needs to change in a way that affects the baseline manifest structure
- An asset file cannot meet the format contract (ratio, size, format) without redesign

## Portability note

Codex: use `rg` to locate manifest files and key type definitions.
Claude Code: use the `Grep` tool for the same searches and the `Read` tool to inspect found files. The asset format rules and manifest contract are identical for both agents.
