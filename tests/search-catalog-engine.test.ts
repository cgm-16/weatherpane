import { describe, expect, it } from 'vitest';

import type {
  CatalogDepth,
  CatalogEntry,
  LocationCatalog,
} from '../frontend/entities/location/model/catalog';
import { getCatalogEntryById } from '../frontend/entities/location/model/catalog-lookup';
import generatedSearchCatalog from '../frontend/entities/location/catalog.search.generated.json';
import { POPULAR_LOCATIONS } from '../frontend/entities/location/data/popular-locations';
import {
  getCatalogEntryFromSearchResult,
  getCatalogLocationResultsByCanonicalPath,
  searchCatalogLocations,
} from '../frontend/entities/location/model/search';

function createEntry(canonicalPath: string): CatalogEntry {
  const segments = canonicalPath.split('-');
  const depth = segments.length as CatalogDepth;
  const [siDo, siGunGu, eupMyeonDong, ri] = segments;
  const leafLabel = segments.at(-1)!;

  return {
    archetypeKey: null,
    canonicalPath,
    catalogLocationId: `catalog:${canonicalPath}`,
    depth,
    display: {
      primaryLabel: leafLabel,
      secondaryLabel:
        segments.length === 1 ? null : segments.slice(0, -1).join('-'),
    },
    eupMyeonDong,
    leafLabel,
    overrideKey: null,
    ri,
    siDo,
    siGunGu,
    tokens: [canonicalPath, ...segments],
  };
}

const entries = [
  createEntry('서울특별시'),
  createEntry('서울특별시-성동구'),
  createEntry('서울특별시-성동구-행당동'),
  createEntry('서울특별시-종로구'),
  createEntry('서울특별시-종로구-무악동'),
  createEntry('서울특별시-종로구-청운동'),
  createEntry('부산광역시-중구-중앙동'),
  createEntry('강원특별자치도-고성군-중앙동'),
  createEntry('강원특별자치도-양양군-성동리'),
];

const catalog: LocationCatalog = {
  entries,
  generatedAt: '2026-04-11T18:00:00+09:00',
  total: entries.length,
  version: '1',
};

describe('searchCatalogLocations', () => {
  it('returns the real default 청운동 result synchronously', () => {
    expect(searchCatalogLocations('청운동')).toContainEqual({
      canonicalPath: '서울특별시-종로구-청운동',
      catalogLocationId: '5f5def784f91',
      primaryLabel: '청운동',
      secondaryPath: '서울특별시-종로구',
    });
  });

  it('does not broaden already-suffixed queries to unrelated stripped-name entries', () => {
    expect(
      searchCatalogLocations('성동구', catalog).map(
        ({ canonicalPath }) => canonicalPath
      )
    ).toEqual(['서울특별시-성동구', '서울특별시-성동구-행당동']);
  });

  it('matches decomposed Hangul input via NFC normalization', () => {
    expect(searchCatalogLocations('청운동'.normalize('NFD'), catalog)).toEqual([
      {
        canonicalPath: '서울특별시-종로구-청운동',
        catalogLocationId: 'catalog:서울특별시-종로구-청운동',
        primaryLabel: '청운동',
        secondaryPath: '서울특별시-종로구',
      },
    ]);
  });

  it('returns the exact leaf match as a UI-ready result', () => {
    expect(searchCatalogLocations('청운동', catalog)).toEqual([
      {
        canonicalPath: '서울특별시-종로구-청운동',
        catalogLocationId: 'catalog:서울특별시-종로구-청운동',
        primaryLabel: '청운동',
        secondaryPath: '서울특별시-종로구',
      },
    ]);
  });

  it('includes exact segment matches after the exact leaf result', () => {
    expect(
      searchCatalogLocations('서울특별시', catalog).map(
        ({ canonicalPath }) => canonicalPath
      )
    ).toEqual([
      '서울특별시',
      '서울특별시-성동구',
      '서울특별시-종로구',
      '서울특별시-성동구-행당동',
      '서울특별시-종로구-무악동',
      '서울특별시-종로구-청운동',
    ]);
  });

  it('supports narrow suffix omission for common administrative endings', () => {
    expect(
      searchCatalogLocations('종로', catalog).map(
        ({ canonicalPath }) => canonicalPath
      )
    ).toEqual([
      '서울특별시-종로구',
      '서울특별시-종로구-무악동',
      '서울특별시-종로구-청운동',
    ]);
  });

  it('normalizes spacing and punctuation and keeps broader matches ahead of descendants', () => {
    expect(
      searchCatalogLocations('서울특별시 / 종로구', catalog).map(
        ({ canonicalPath }) => canonicalPath
      )
    ).toEqual([
      '서울특별시-종로구',
      '서울특별시-종로구-무악동',
      '서울특별시-종로구-청운동',
    ]);
  });

  it('returns repeated names under different parents in deterministic order', () => {
    const firstRun = searchCatalogLocations('중앙동', catalog);
    const secondRun = searchCatalogLocations('중앙동', catalog);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun).toEqual([
      {
        canonicalPath: '강원특별자치도-고성군-중앙동',
        catalogLocationId: 'catalog:강원특별자치도-고성군-중앙동',
        primaryLabel: '중앙동',
        secondaryPath: '강원특별자치도-고성군',
      },
      {
        canonicalPath: '부산광역시-중구-중앙동',
        catalogLocationId: 'catalog:부산광역시-중구-중앙동',
        primaryLabel: '중앙동',
        secondaryPath: '부산광역시-중구',
      },
    ]);
  });

  it('returns no results for an empty query', () => {
    expect(searchCatalogLocations('', catalog)).toEqual([]);
    expect(searchCatalogLocations('   ', catalog)).toEqual([]);
  });
});

describe('getCatalogEntryFromSearchResult', () => {
  it('reconstructs the matched default search artifact tuple', () => {
    const result = searchCatalogLocations('청운동').find(
      ({ catalogLocationId }) => catalogLocationId === '5f5def784f91'
    );

    expect(result).toBeDefined();
    expect(getCatalogEntryFromSearchResult(result!)).toEqual({
      archetypeKey: null,
      canonicalPath: '서울특별시-종로구-청운동',
      catalogLocationId: '5f5def784f91',
      depth: 3,
      display: {
        primaryLabel: '청운동',
        secondaryLabel: '서울특별시-종로구',
      },
      eupMyeonDong: '청운동',
      leafLabel: '청운동',
      overrideKey: null,
      siDo: '서울특별시',
      siGunGu: '종로구',
      tokens: ['서울특별시-종로구-청운동', '서울특별시', '종로구', '청운동'],
    });
  });
});

describe('getCatalogLocationResultsByCanonicalPath', () => {
  it('returns a default artifact result for an exact canonical path', () => {
    expect(
      getCatalogLocationResultsByCanonicalPath(['서울특별시-종로구-청운동'])
    ).toEqual([
      {
        canonicalPath: '서울특별시-종로구-청운동',
        catalogLocationId: '5f5def784f91',
        primaryLabel: '청운동',
        secondaryPath: '서울특별시-종로구',
      },
    ]);
  });

  it('returns every popular default path in requested order with one artifact scan', () => {
    const originalEntries = generatedSearchCatalog.entries;
    const originalSegments = generatedSearchCatalog.segments;
    let entryIterations = 0;
    let segmentReads = 0;
    const maxSegmentReadsPerPath = 4 * 2;

    generatedSearchCatalog.entries = new Proxy(originalEntries, {
      get(target, property, receiver) {
        if (property === Symbol.iterator) {
          return function* iterateEntries() {
            entryIterations += 1;
            yield* target;
          };
        }

        return Reflect.get(target, property, receiver);
      },
    });
    generatedSearchCatalog.segments = new Proxy(originalSegments, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) {
          segmentReads += 1;
        }

        return Reflect.get(target, property, receiver);
      },
    });

    try {
      const results =
        getCatalogLocationResultsByCanonicalPath(POPULAR_LOCATIONS);

      expect(results.map(({ canonicalPath }) => canonicalPath)).toEqual(
        POPULAR_LOCATIONS
      );
      expect(entryIterations).toBe(1);
      expect(segmentReads).toBeLessThanOrEqual(
        POPULAR_LOCATIONS.length * maxSegmentReadsPerPath
      );
    } finally {
      generatedSearchCatalog.entries = originalEntries;
      generatedSearchCatalog.segments = originalSegments;
    }
  });
});

describe('getCatalogEntryById', () => {
  it('returns the custom catalog entry for a known id and null for unknown', () => {
    const firstEntry = entries[0];
    expect(getCatalogEntryById(firstEntry.catalogLocationId, catalog)).toEqual(
      firstEntry
    );
    expect(getCatalogEntryById('nonexistent-id', catalog)).toBeNull();
  });

  it('reconstructs known, first, and last default artifact entries', () => {
    expect(getCatalogEntryById('5f5def784f91')).toMatchObject({
      canonicalPath: '서울특별시-종로구-청운동',
      catalogLocationId: '5f5def784f91',
    });
    expect(getCatalogEntryById('af6564d37582')).toMatchObject({
      canonicalPath: '서울특별시',
      catalogLocationId: 'af6564d37582',
    });
    expect(getCatalogEntryById('8c770f6aad99')).toMatchObject({
      canonicalPath: '전북특별자치도-부안군-위도면-하왕등리',
      catalogLocationId: '8c770f6aad99',
    });
  });

  it('returns null for an unknown default artifact ID', () => {
    expect(getCatalogEntryById('000000000000')).toBeNull();
  });
});
