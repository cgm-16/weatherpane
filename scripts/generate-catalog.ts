// scripts/generate-catalog.ts
// 실행: pnpm generate:catalog
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

// ── 원시 데이터 읽기 ────────────────────────────────────────────────────────
const rawJson = readFileSync(inputPath, 'utf-8');
const rawPaths: unknown = JSON.parse(rawJson);

if (!Array.isArray(rawPaths)) {
  throw new Error('generate-catalog: input JSON is not an array');
}

// ── 파싱 전 중복 항목 검사 ──────────────────────────────────────────────────
const seenCanonical = new Set<string>();
for (const [index, rawPath] of rawPaths.entries()) {
  if (typeof rawPath !== 'string') {
    throw new Error(
      `generate-catalog: entry at index ${index} is not a string`
    );
  }
  const canonicalPath = rawPath.normalize('NFC');
  if (seenCanonical.has(canonicalPath)) {
    throw new Error(
      `generate-catalog: duplicate entry in source data (after NFC normalization): "${canonicalPath}"`
    );
  }
  seenCanonical.add(canonicalPath);
}

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

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${entries.length} entries → ${outputPath}`);
console.log(
  `Popular locations validated: ${validation.valid.length}/${POPULAR_LOCATIONS.length}`
);
