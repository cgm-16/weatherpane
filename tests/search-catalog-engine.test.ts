import { describe, expect, it } from 'vitest';

import type {
  CatalogDepth,
  CatalogEntry,
  LocationCatalog,
} from '../frontend/entities/location/model/catalog';
import {
  getCatalogEntryById,
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

describe('getCatalogEntryById', () => {
  it('returns the entry for a known id and null for unknown', () => {
    const firstEntry = entries[0];
    expect(getCatalogEntryById(firstEntry.catalogLocationId, catalog)).toEqual(
      firstEntry
    );
    expect(getCatalogEntryById('nonexistent-id', catalog)).toBeNull();
  });
});
