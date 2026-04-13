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
- `scripts/stitch/sketch-batch.json` is the single source of truth for which keys need art; its `keys` array must stay in exact lockstep with the baseline manifest key set (enforced by the drift test)

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

5. Intent: regenerate or add an asset via Stitch.
   Action: follow the full generation loop in **## Stitch batch workflow** below.
   Done-check: `pnpm exec vitest run tests/asset/manifest.test.ts` passes (drift guard + file existence).

## Verification

- `pnpm exec vitest run` for the manifest loader and key-resolution logic
- Confirm the fallback path is tested: simulate remote fetch failure and verify baseline assets render
- Confirm no component test imports an asset by path rather than by semantic key

## Stitch batch workflow

### Why this exists

Stitch generates images but cannot name them. After generation, a screen's `title` holds the prompt text, `name` is an opaque ID, and `screenshot.downloadUrl` is the only public image URL. This workflow bridges that gap: a hand-edited batch file declares which keys need art; a generator-written map records the Stitch-side metadata; a post-processor converts raw PNGs to the app's WebP contract.

### Source-of-truth files

- **`scripts/stitch/sketch-batch.json`** — hand-edited. Contains `projectId`, prompt template fields, and a `keys` array listing every semantic key that needs an asset. Adding a key here (and to the baseline manifest) is the first step when expanding the asset set.
- **`scripts/stitch/asset-map.json`** — generator-written; do not hand-edit. One entry per key with fields: `screenId`, `downloadUrl`, `sourceSize`, `generatedAt`, `localPath`, `sha256`. Updated by `process-sketch.ts` after post-processing.

### Generation loop (per uncovered key)

1. Snapshot existing screens: `mcp__stitch__list_screens({ projectId })`.
2. Generate: `mcp__stitch__generate_screen_from_text({ projectId, prompt })` using the assembled prompt (preamble + composition rules + subject + variant text from `sketch-batch.json`).
3. Re-list screens; diff against the snapshot to identify the new screen.
4. Append to `asset-map.json`: `screenId`, `downloadUrl`, `sourceSize`, `generatedAt`.
5. Download raw PNG:
   ```
   curl -L "<downloadUrl>=w2400" -o "scripts/stitch/_raw/<safe-key>.png"
   ```
   Append `=w2400` to the URL when the provider supports it for higher-resolution output.
6. Post-process:
   ```
   pnpm exec tsx scripts/stitch/process-sketch.ts --key <semantic-key> --input scripts/stitch/_raw/<safe-key>.png
   ```
   This crops to 3:2 (bottom crop), resizes to 2400×1600, quality-sweeps to find the highest quality under 400 KB, writes `public/sketches/<key>.webp`, and updates `asset-map.json` with `localPath` and `sha256`.

### Resumability

The loop is idempotent. If `asset-map.json[key].localPath` exists on disk, that key is already done — skip it.

### Drift guard

`tests/asset/manifest.test.ts` enforces four invariants and will fail if any break:

1. `sketch-batch.json` `keys` array equals `baseline-manifest.json` key set exactly.
2. All baseline keys are valid `SemanticKey` values.
3. `asset-map.json[key].localPath` equals `public` + the baseline manifest URL for every key.
4. Every WebP referenced by the baseline manifest exists on disk.

## Stop and ask Ori

- A new weather condition requires a semantic key that doesn't fit the existing key taxonomy
- The remote manifest schema needs to change in a way that affects the baseline manifest structure
- An asset file cannot meet the format contract (ratio, size, format) without redesign

## Portability note

Codex: use `rg` to locate manifest files and key type definitions.
Claude Code: use the `Grep` tool for the same searches and the `Read` tool to inspect found files. The asset format rules and manifest contract are identical for both agents.
