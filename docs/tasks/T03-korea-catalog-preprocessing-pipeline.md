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
