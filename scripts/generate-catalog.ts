// scripts/generate-catalog.ts
// Run with: pnpm generate:catalog
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LocationCatalog } from '../frontend/entities/location/model/catalog';
import { POPULAR_LOCATIONS } from '../frontend/entities/location/data/popular-locations';
import { parseCatalogEntry, validatePopularLocations } from './catalog-parser';

const root = new URL('..', import.meta.url);
const inputPath = fileURLToPath(new URL('docs/korea_districts.json', root));
const outputPath = fileURLToPath(
  new URL('frontend/entities/location/catalog.generated.json', root)
);

// ── Read raw data ──────────────────────────────────────────────────────────
const rawJson = readFileSync(inputPath, 'utf-8');
const rawPaths: unknown = JSON.parse(rawJson);

if (!Array.isArray(rawPaths)) {
  throw new Error('generate-catalog: input JSON is not an array');
}

// ── Check for duplicates before parsing ───────────────────────────────────
const seen = new Set<string>();
for (const path of rawPaths as string[]) {
  if (seen.has(path)) {
    throw new Error(
      `generate-catalog: duplicate entry in source data: "${path}"`
    );
  }
  seen.add(path);
}

// ── Parse entries ──────────────────────────────────────────────────────────
const entries = (rawPaths as string[]).map((path, index) => {
  if (typeof path !== 'string') {
    throw new Error(
      `generate-catalog: entry at index ${index} is not a string`
    );
  }
  return parseCatalogEntry(path);
});

// ── Validate popular locations ─────────────────────────────────────────────
const validation = validatePopularLocations(entries, POPULAR_LOCATIONS);
if (validation.invalid.length > 0) {
  throw new Error(
    `generate-catalog: popular locations not found in catalog:\n  ${validation.invalid.join('\n  ')}`
  );
}

// ── Write output ───────────────────────────────────────────────────────────
const catalog: LocationCatalog = {
  version: '1',
  generatedAt: new Date().toISOString(),
  total: entries.length,
  entries,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${entries.length} entries → ${outputPath}`);
console.log(
  `Popular locations validated: ${validation.valid.length}/${POPULAR_LOCATIONS.length}`
);
