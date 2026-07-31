import { describe, expect, it } from 'vitest';

import {
  assertCatalogBundleBudget,
  assertGeneratedCatalogBundleBudgets,
  deriveCatalogBundleBudgets,
  type ClientBundleReport,
} from '../scripts/client-bundle-budget';

const searchRoute = '/project/app/routes/search.tsx';
const detailRoute = '/project/app/routes/location.tsx';
const searchCatalog =
  '/project/frontend/entities/location/catalog.search.generated.json';
const lookupCatalog =
  '/project/frontend/entities/location/catalog.lookup.generated.json';
const fullCatalog =
  '/project/frontend/entities/location/catalog.generated.json';

const measured = {
  lookup: { gzipBytes: 50, rawBytes: 500 },
  search: { gzipBytes: 100, rawBytes: 1_000 },
};

function createReport(
  overrides: Partial<ClientBundleReport> = {}
): ClientBundleReport {
  return {
    chunks: [
      {
        dynamicImports: ['assets/search-catalog.js'],
        fileName: 'assets/search-route.js',
        gzipBytes: 10,
        imports: [],
        modules: [searchRoute],
        rawBytes: 100,
      },
      {
        dynamicImports: [],
        fileName: 'assets/search-catalog.js',
        gzipBytes: measured.search.gzipBytes,
        imports: [],
        modules: [searchCatalog],
        rawBytes: measured.search.rawBytes,
      },
      {
        dynamicImports: [],
        fileName: 'assets/detail-route.js',
        gzipBytes: 10,
        imports: ['assets/detail-catalog.js'],
        modules: [detailRoute],
        rawBytes: 100,
      },
      {
        dynamicImports: [],
        fileName: 'assets/detail-catalog.js',
        gzipBytes: measured.lookup.gzipBytes,
        imports: [],
        modules: [lookupCatalog],
        rawBytes: measured.lookup.rawBytes,
      },
      {
        dynamicImports: [],
        fileName: 'assets/shared.js',
        gzipBytes: 20,
        imports: [],
        modules: ['/project/frontend/shared/runtime.ts'],
        rawBytes: 200,
      },
    ],
    ...overrides,
  };
}

describe('catalog bundle budgets', () => {
  it('derives every limit with five percent headroom', () => {
    const budgets = deriveCatalogBundleBudgets(measured);

    expect(budgets).toEqual({
      lookup: { gzipBytes: 53, rawBytes: 525 },
      search: { gzipBytes: 105, rawBytes: 1_050 },
    });
  });

  it('rejects generated limits that do not equal the documented formula', () => {
    expect(() =>
      assertGeneratedCatalogBundleBudgets({
        baseline: { gzipBytes: 847_465, rawBytes: 8_733_640 },
        headroomRatio: 0.05,
        lookup: {
          gzipBytes: 53,
          measuredGzipBytes: 50,
          measuredRawBytes: 500,
          rawBytes: 524,
        },
        search: {
          gzipBytes: 105,
          measuredGzipBytes: 100,
          measuredRawBytes: 1_000,
          rawBytes: 1_050,
        },
        version: 1,
      })
    ).toThrow('조회 카탈로그 예산 공식이 일치하지 않습니다.');
  });

  it('accepts exact-limit catalog-bearing chunks', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const report = createReport({
      chunks: createReport().chunks.map((chunk) => {
        if (chunk.fileName === 'assets/search-catalog.js') {
          return { ...chunk, ...budgets.search };
        }
        if (chunk.fileName === 'assets/detail-catalog.js') {
          return { ...chunk, ...budgets.lookup };
        }
        return chunk;
      }),
    });

    expect(assertCatalogBundleBudget(report, budgets).search.actual).toEqual(
      budgets.search
    );
    expect(assertCatalogBundleBudget(report, budgets).lookup.actual).toEqual(
      budgets.lookup
    );
  });

  it('returns baseline deltas and reduction percentages for measured artifacts', () => {
    const evidence = assertCatalogBundleBudget(
      createReport(),
      deriveCatalogBundleBudgets(measured)
    );

    expect(evidence.search.baselineDelta).toEqual({
      gzipBytes: measured.search.gzipBytes - 847_465,
      rawBytes: measured.search.rawBytes - 8_733_640,
    });
    expect(evidence.lookup.reductionPercentage.rawBytes).toBeCloseTo(
      ((8_733_640 - measured.lookup.rawBytes) / 8_733_640) * 100
    );
  });

  it('rejects Search gzip one byte above its derived limit', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const report = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/search-catalog.js'
          ? { ...chunk, gzipBytes: budgets.search.gzipBytes + 1 }
          : chunk
      ),
    });

    expect(() => assertCatalogBundleBudget(report, budgets)).toThrow(
      `검색 카탈로그 gzip 예산 초과: ${budgets.search.gzipBytes + 1} > ${budgets.search.gzipBytes}`
    );
  });

  it('rejects Detail gzip one byte above its derived limit', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const report = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/detail-catalog.js'
          ? { ...chunk, gzipBytes: budgets.lookup.gzipBytes + 1 }
          : chunk
      ),
    });

    expect(() => assertCatalogBundleBudget(report, budgets)).toThrow(
      `상세 조회 gzip 예산 초과: ${budgets.lookup.gzipBytes + 1} > ${budgets.lookup.gzipBytes}`
    );
  });

  it('rejects one byte above either raw limit', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const searchReport = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/search-catalog.js'
          ? { ...chunk, rawBytes: budgets.search.rawBytes + 1 }
          : chunk
      ),
    });
    const lookupReport = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/detail-catalog.js'
          ? { ...chunk, rawBytes: budgets.lookup.rawBytes + 1 }
          : chunk
      ),
    });

    expect(() => assertCatalogBundleBudget(searchReport, budgets)).toThrow(
      `검색 카탈로그 raw 예산 초과: ${budgets.search.rawBytes + 1} > ${budgets.search.rawBytes}`
    );
    expect(() => assertCatalogBundleBudget(lookupReport, budgets)).toThrow(
      `상세 조회 raw 예산 초과: ${budgets.lookup.rawBytes + 1} > ${budgets.lookup.rawBytes}`
    );
  });

  it('rejects the canonical full catalog in every client chunk', () => {
    const report = createReport({
      chunks: [
        ...createReport().chunks,
        {
          dynamicImports: [],
          fileName: 'assets/full-catalog.js',
          gzipBytes: 1,
          imports: [],
          modules: [fullCatalog],
          rawBytes: 1,
        },
      ],
    });

    expect(() =>
      assertCatalogBundleBudget(report, deriveCatalogBundleBudgets(measured))
    ).toThrow('전체 카탈로그가 클라이언트 번들에 포함되었습니다.');
  });

  it('rejects Detail-to-Search and Search-to-lookup reachability', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const detailToSearch = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/detail-route.js'
          ? {
              ...chunk,
              dynamicImports: ['assets/search-catalog.js'],
              imports: [],
            }
          : chunk
      ),
    });
    const searchToLookup = createReport({
      chunks: createReport().chunks.map((chunk) =>
        chunk.fileName === 'assets/search-route.js'
          ? {
              ...chunk,
              dynamicImports: [],
              imports: ['assets/detail-catalog.js'],
            }
          : chunk
      ),
    });

    expect(() => assertCatalogBundleBudget(detailToSearch, budgets)).toThrow(
      'Detail 라우트가 검색 카탈로그에 도달합니다.'
    );
    expect(() => assertCatalogBundleBudget(searchToLookup, budgets)).toThrow(
      'Search 라우트가 조회 카탈로그에 도달합니다.'
    );
  });

  it('follows recursive static and dynamic imports once', () => {
    const budgets = deriveCatalogBundleBudgets({
      lookup: { gzipBytes: 60, rawBytes: 600 },
      search: { gzipBytes: 120, rawBytes: 1_200 },
    });
    const report = createReport({
      chunks: [
        {
          dynamicImports: ['assets/search-middle.js'],
          fileName: 'assets/search-route.js',
          gzipBytes: 1,
          imports: [],
          modules: [searchRoute],
          rawBytes: 1,
        },
        {
          dynamicImports: ['assets/search-catalog.js'],
          fileName: 'assets/search-middle.js',
          gzipBytes: 1,
          imports: ['assets/search-catalog.js'],
          modules: ['/project/frontend/pages/search/model.ts'],
          rawBytes: 1,
        },
        {
          dynamicImports: [],
          fileName: 'assets/search-catalog.js',
          gzipBytes: 120,
          imports: [],
          modules: [searchCatalog],
          rawBytes: 1_200,
        },
        ...createReport().chunks.filter((chunk) =>
          chunk.fileName.startsWith('assets/detail')
        ),
      ],
    });

    const evidence = assertCatalogBundleBudget(report, budgets);

    expect(evidence.search.reachableChunkFileNames).toEqual([
      'assets/search-catalog.js',
      'assets/search-middle.js',
      'assets/search-route.js',
    ]);
  });

  it('fails closed when route owners or catalog artifacts are missing', () => {
    const budgets = deriveCatalogBundleBudgets(measured);
    const missingSearchRoute = createReport({
      chunks: createReport().chunks.filter(
        (chunk) => chunk.fileName !== 'assets/search-route.js'
      ),
    });
    const missingLookupArtifact = createReport({
      chunks: createReport().chunks.filter(
        (chunk) => chunk.fileName !== 'assets/detail-catalog.js'
      ),
    });

    expect(() =>
      assertCatalogBundleBudget(missingSearchRoute, budgets)
    ).toThrow('Search 라우트 청크를 찾을 수 없습니다.');
    expect(() =>
      assertCatalogBundleBudget(missingLookupArtifact, budgets)
    ).toThrow('조회 카탈로그 청크를 찾을 수 없습니다.');
  });
});
