export interface ClientBundleChunk {
  fileName: string;
  imports: string[];
  dynamicImports: string[];
  modules: string[];
  rawBytes: number;
  gzipBytes: number;
}

export interface ClientBundleReport {
  chunks: ClientBundleChunk[];
}

export interface CatalogBundleBytes {
  rawBytes: number;
  gzipBytes: number;
}

export interface CatalogBundleBudgets {
  search: CatalogBundleBytes;
  lookup: CatalogBundleBytes;
}

export interface GeneratedCatalogBundleBudget extends CatalogBundleBytes {
  measuredRawBytes: number;
  measuredGzipBytes: number;
}

export interface GeneratedCatalogBundleBudgets {
  version: 1;
  headroomRatio: number;
  baseline: CatalogBundleBytes;
  search: GeneratedCatalogBundleBudget;
  lookup: GeneratedCatalogBundleBudget;
}

export interface CatalogBundleEvidence {
  search: CatalogBundleRouteEvidence;
  lookup: CatalogBundleRouteEvidence;
}

export interface CatalogBundleRouteEvidence {
  actual: CatalogBundleBytes;
  baselineDelta: CatalogBundleBytes;
  reachableChunkFileNames: string[];
  catalogChunkFileNames: string[];
  reductionPercentage: CatalogBundlePercentage;
}

export interface CatalogBundlePercentage {
  rawBytes: number;
  gzipBytes: number;
}

export const catalogBundleHeadroomRatio = 0.05;
export const catalogBundleBaseline: CatalogBundleBytes = {
  gzipBytes: 847_465,
  rawBytes: 8_733_640,
};
const searchRoute = '/app/routes/search.tsx';
const detailRoute = '/app/routes/location.tsx';
const fullCatalog = '/frontend/entities/location/catalog.generated.json';
const searchCatalog =
  '/frontend/entities/location/catalog.search.generated.json';
const lookupCatalog =
  '/frontend/entities/location/catalog.lookup.generated.json';

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

function hasModuleSuffix(chunk: ClientBundleChunk, suffix: string): boolean {
  return chunk.modules.some((moduleId) =>
    normalizePath(moduleId).endsWith(suffix)
  );
}

function findChunkByModuleSuffix(
  chunks: ClientBundleChunk[],
  suffix: string,
  errorMessage: string
): ClientBundleChunk {
  const chunk = chunks.find((candidate) => hasModuleSuffix(candidate, suffix));

  if (!chunk) {
    throw new Error(errorMessage);
  }

  return chunk;
}

function findReachableChunks(
  initialChunk: ClientBundleChunk,
  chunksByFileName: Map<string, ClientBundleChunk>
): ClientBundleChunk[] {
  const reachableChunks = new Map<string, ClientBundleChunk>();
  const pendingFileNames = [initialChunk.fileName];

  while (pendingFileNames.length > 0) {
    const fileName = pendingFileNames.pop();

    if (!fileName || reachableChunks.has(fileName)) {
      continue;
    }

    const chunk = chunksByFileName.get(fileName);

    if (!chunk) {
      continue;
    }

    reachableChunks.set(fileName, chunk);
    pendingFileNames.push(...chunk.imports, ...chunk.dynamicImports);
  }

  return [...reachableChunks.values()].sort((left, right) =>
    left.fileName.localeCompare(right.fileName, 'en')
  );
}

function findCatalogChunks(
  chunks: ClientBundleChunk[],
  catalogModuleSuffix: string,
  errorMessage: string
): ClientBundleChunk[] {
  const catalogChunks = chunks.filter((chunk) =>
    hasModuleSuffix(chunk, catalogModuleSuffix)
  );

  if (catalogChunks.length === 0) {
    throw new Error(errorMessage);
  }

  return catalogChunks;
}

function sumChunkBytes(chunks: ClientBundleChunk[]): CatalogBundleBytes {
  return chunks.reduce(
    (total, chunk) => ({
      gzipBytes: total.gzipBytes + chunk.gzipBytes,
      rawBytes: total.rawBytes + chunk.rawBytes,
    }),
    { gzipBytes: 0, rawBytes: 0 }
  );
}

function assertWithinBudget(
  label: string,
  actual: CatalogBundleBytes,
  limit: CatalogBundleBytes
): void {
  if (actual.rawBytes > limit.rawBytes) {
    throw new Error(
      `${label} raw 예산 초과: ${actual.rawBytes} > ${limit.rawBytes}`
    );
  }

  if (actual.gzipBytes > limit.gzipBytes) {
    throw new Error(
      `${label} gzip 예산 초과: ${actual.gzipBytes} > ${limit.gzipBytes}`
    );
  }
}

function toRouteEvidence(
  reachableChunks: ClientBundleChunk[],
  catalogChunks: ClientBundleChunk[]
): CatalogBundleRouteEvidence {
  const actual = sumChunkBytes(catalogChunks);

  return {
    actual,
    baselineDelta: {
      gzipBytes: actual.gzipBytes - catalogBundleBaseline.gzipBytes,
      rawBytes: actual.rawBytes - catalogBundleBaseline.rawBytes,
    },
    catalogChunkFileNames: catalogChunks.map((chunk) => chunk.fileName),
    reachableChunkFileNames: reachableChunks.map((chunk) => chunk.fileName),
    reductionPercentage: {
      gzipBytes:
        ((catalogBundleBaseline.gzipBytes - actual.gzipBytes) /
          catalogBundleBaseline.gzipBytes) *
        100,
      rawBytes:
        ((catalogBundleBaseline.rawBytes - actual.rawBytes) /
          catalogBundleBaseline.rawBytes) *
        100,
    },
  };
}

export function deriveCatalogBundleBudgets(
  measured: CatalogBundleBudgets
): CatalogBundleBudgets {
  return {
    lookup: {
      gzipBytes: Math.ceil(
        measured.lookup.gzipBytes * (1 + catalogBundleHeadroomRatio)
      ),
      rawBytes: Math.ceil(
        measured.lookup.rawBytes * (1 + catalogBundleHeadroomRatio)
      ),
    },
    search: {
      gzipBytes: Math.ceil(
        measured.search.gzipBytes * (1 + catalogBundleHeadroomRatio)
      ),
      rawBytes: Math.ceil(
        measured.search.rawBytes * (1 + catalogBundleHeadroomRatio)
      ),
    },
  };
}

export function assertGeneratedCatalogBundleBudgets(
  generatedBudgets: GeneratedCatalogBundleBudgets
): CatalogBundleBudgets {
  if (generatedBudgets.headroomRatio !== catalogBundleHeadroomRatio) {
    throw new Error('카탈로그 예산 여유 비율이 일치하지 않습니다.');
  }

  const budgets = deriveCatalogBundleBudgets({
    lookup: {
      gzipBytes: generatedBudgets.lookup.measuredGzipBytes,
      rawBytes: generatedBudgets.lookup.measuredRawBytes,
    },
    search: {
      gzipBytes: generatedBudgets.search.measuredGzipBytes,
      rawBytes: generatedBudgets.search.measuredRawBytes,
    },
  });

  if (
    generatedBudgets.search.rawBytes !== budgets.search.rawBytes ||
    generatedBudgets.search.gzipBytes !== budgets.search.gzipBytes
  ) {
    throw new Error('검색 카탈로그 예산 공식이 일치하지 않습니다.');
  }

  if (
    generatedBudgets.lookup.rawBytes !== budgets.lookup.rawBytes ||
    generatedBudgets.lookup.gzipBytes !== budgets.lookup.gzipBytes
  ) {
    throw new Error('조회 카탈로그 예산 공식이 일치하지 않습니다.');
  }

  return budgets;
}

export function assertCatalogBundleBudget(
  report: ClientBundleReport,
  budgets: CatalogBundleBudgets
): CatalogBundleEvidence {
  if (report.chunks.length === 0) {
    throw new Error('클라이언트 번들 보고서가 비어 있습니다.');
  }

  if (report.chunks.some((chunk) => hasModuleSuffix(chunk, fullCatalog))) {
    throw new Error('전체 카탈로그가 클라이언트 번들에 포함되었습니다.');
  }

  const chunksByFileName = new Map(
    report.chunks.map((chunk) => [chunk.fileName, chunk])
  );
  const searchRouteChunk = findChunkByModuleSuffix(
    report.chunks,
    searchRoute,
    'Search 라우트 청크를 찾을 수 없습니다.'
  );
  const detailRouteChunk = findChunkByModuleSuffix(
    report.chunks,
    detailRoute,
    'Detail 라우트 청크를 찾을 수 없습니다.'
  );
  const searchArtifactChunk = findChunkByModuleSuffix(
    report.chunks,
    searchCatalog,
    '검색 카탈로그 청크를 찾을 수 없습니다.'
  );
  const lookupArtifactChunk = findChunkByModuleSuffix(
    report.chunks,
    lookupCatalog,
    '조회 카탈로그 청크를 찾을 수 없습니다.'
  );
  const searchReachableChunks = findReachableChunks(
    searchRouteChunk,
    chunksByFileName
  );
  const detailReachableChunks = findReachableChunks(
    detailRouteChunk,
    chunksByFileName
  );
  const searchReachableFileNames = new Set(
    searchReachableChunks.map((chunk) => chunk.fileName)
  );
  const detailReachableFileNames = new Set(
    detailReachableChunks.map((chunk) => chunk.fileName)
  );

  if (detailReachableFileNames.has(searchArtifactChunk.fileName)) {
    throw new Error('Detail 라우트가 검색 카탈로그에 도달합니다.');
  }

  if (searchReachableFileNames.has(lookupArtifactChunk.fileName)) {
    throw new Error('Search 라우트가 조회 카탈로그에 도달합니다.');
  }

  const searchCatalogChunks = findCatalogChunks(
    searchReachableChunks,
    searchCatalog,
    'Search 라우트가 검색 카탈로그에 도달하지 않습니다.'
  );
  const lookupCatalogChunks = findCatalogChunks(
    detailReachableChunks,
    lookupCatalog,
    'Detail 라우트가 조회 카탈로그에 도달하지 않습니다.'
  );
  const search = toRouteEvidence(searchReachableChunks, searchCatalogChunks);
  const lookup = toRouteEvidence(detailReachableChunks, lookupCatalogChunks);

  assertWithinBudget('검색 카탈로그', search.actual, budgets.search);
  assertWithinBudget('상세 조회', lookup.actual, budgets.lookup);

  return { lookup, search };
}
