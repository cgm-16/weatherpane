// scripts/generate-catalog.ts
// 실행: pnpm generate:catalog
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LocationCatalog } from '../frontend/entities/location/model/catalog';
import {
  buildGeneratedCatalogLookup,
  buildGeneratedSearchCatalog,
} from '../frontend/entities/location/model/catalog-artifacts';
import { POPULAR_LOCATIONS } from '../frontend/entities/location/data/popular-locations';
import {
  parseCatalogEntry,
  validatePopularLocations,
  validateRawCatalogPaths,
} from './catalog-parser';

const root = new URL('..', import.meta.url);
const inputPath = fileURLToPath(new URL('docs/korea_districts.json', root));
const catalogOutputPath = fileURLToPath(
  new URL('frontend/entities/location/catalog.generated.json', root)
);
const searchOutputPath = fileURLToPath(
  new URL('frontend/entities/location/catalog.search.generated.json', root)
);
const lookupOutputPath = fileURLToPath(
  new URL('frontend/entities/location/catalog.lookup.generated.json', root)
);

// ── 원시 데이터 읽기 ────────────────────────────────────────────────────────
const rawJson = readFileSync(inputPath, 'utf-8');
const rawPaths = validateRawCatalogPaths(JSON.parse(rawJson));

// ── 항목 파싱 ────────────────────────────────────────────────────────────────
const entries = (rawPaths as string[]).map((path) => parseCatalogEntry(path));

// ── 인기 지역 검증 ────────────────────────────────────────────────────────────
const validation = validatePopularLocations(entries, POPULAR_LOCATIONS);
if (validation.invalid.length > 0) {
  throw new Error(
    `generate-catalog: popular locations not found in catalog:\n  ${validation.invalid.join('\n  ')}`
  );
}

// ── 결과 파일 쓰기 ────────────────────────────────────────────────────────────
const catalog: LocationCatalog = {
  version: '1',
  generatedAt: process.env.CATALOG_GENERATED_AT ?? new Date().toISOString(),
  total: entries.length,
  entries,
};

const outputs = [
  [catalogOutputPath, catalog],
  [searchOutputPath, buildGeneratedSearchCatalog(entries)],
  [lookupOutputPath, buildGeneratedCatalogLookup(entries)],
] as const;

for (const [outputPath, output] of outputs) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
}

console.log(`Wrote ${entries.length} entries → ${catalogOutputPath}`);
console.log(
  `Popular locations validated: ${validation.valid.length}/${POPULAR_LOCATIONS.length}`
);
