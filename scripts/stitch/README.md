# Stitch sketch asset pipeline

Scripts and data for generating the Weatherpane sketch asset library via the
Stitch MCP and producing `public/sketches/<key>.webp` files the baseline
manifest points at.

## Files

- `sketch-batch.json` — single source of truth for which semantic keys need
  art. Lists all keys and the pieces used to assemble each prompt. Keys here
  MUST equal the set of keys in the WP-020 baseline manifest (enforced by
  `stitch-batch.test.ts`).
- `asset-map.json` — generated audit trail mapping each key to the Stitch
  screen it was sourced from, the download URL, local path, sha256, and a
  timestamp. Committed.
- `_raw/` — scratch directory holding raw PNG downloads before post-processing.
  Gitignored.
- `process-sketch.ts` — Node + sharp post-processor (built in task #4).

## Prompt assembly

For a key `hub/seoul/rainy-day`:

1. Start with `promptTemplate.preamble`.
2. Append `Composition rules:` followed by every entry in
   `promptTemplate.compositionRules` as a bullet list.
3. If `subjectOverrides[key]` exists, append `Depict {subjects[family]} The scene shows {subjectOverrides[key]}`.
   Otherwise, append `Depict {subjects[family]} The scene shows {variants[variant]}`.
4. Append `Negative prompt: {promptTemplate.negativePrompt}`.

`family` is the first two segments of the key (`hub/seoul`). `variant` is the
last segment (`rainy-day`).

## Generation loop (manual, one key at a time)

1. Take a snapshot of `mcp__stitch__list_screens` for the project.
2. Call `mcp__stitch__generate_screen_from_text` with the assembled prompt.
3. Re-list screens and diff to find the new screen id.
4. Verify the returned screen is 3:2 landscape. If not, reject and retry with
   stronger framing language.
5. Append an entry to `asset-map.json`:

   ```json
   {
     "hub/seoul/rainy-day": {
       "screenId": "projects/15042235601276525488/screens/...",
       "downloadUrl": "https://lh3.googleusercontent.com/...",
       "sourceSize": "2400x1600",
       "generatedAt": "2026-04-13T..."
     }
   }
   ```

6. curl the `downloadUrl` to `_raw/<key-safe>.png`.
7. Run `process-sketch.ts --key hub/seoul/rainy-day --input _raw/...png`.
8. The script writes `public/sketches/hub/seoul/rainy-day.webp` and fills in
   `localPath` + `sha256` in `asset-map.json`.
9. Commit the image and the map entry as one unit.

The loop is resumable: if `asset-map.json[key].localPath` exists and the file
is on disk, skip that key.
