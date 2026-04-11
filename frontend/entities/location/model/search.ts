import catalogData from '../catalog.generated.json';

import type { CatalogEntry, LocationCatalog } from './catalog';

export interface SearchCatalogResult {
  primaryLabel: string;
  secondaryPath: string | null;
  catalogLocationId: string;
  canonicalPath: string;
}

interface PreparedCatalogEntry {
  entry: CatalogEntry;
  leafVariants: Set<string>;
  segmentVariants: Set<string>;
  pathComparable: string;
}

enum MatchRank {
  ExactLeaf = 1,
  ExactSegment = 2,
  PathSubstring = 4,
}

const defaultCatalog = catalogData as LocationCatalog;
const omittedSuffixes = ['시', '도', '구', '군', '읍', '면', '동', '리'];
const separatorPattern = /[\s\p{P}\p{S}]+/gu;
const defaultPreparedEntries = defaultCatalog.entries.map(prepareCatalogEntry);
const preparedEntriesCache = new WeakMap<
  LocationCatalog,
  PreparedCatalogEntry[]
>();

function normalizeComparable(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(separatorPattern, '');
}

function buildComparableVariants(
  value: string,
  includeOmittedSuffixVariants = true
): Set<string> {
  const comparable = normalizeComparable(value);
  const variants = new Set<string>();

  if (!comparable) {
    return variants;
  }

  variants.add(comparable);

  if (includeOmittedSuffixVariants) {
    for (const suffix of omittedSuffixes) {
      if (comparable.endsWith(suffix) && comparable.length > suffix.length) {
        variants.add(comparable.slice(0, -suffix.length));
      }
    }
  }

  return variants;
}

function prepareCatalogEntry(entry: CatalogEntry): PreparedCatalogEntry {
  const segments = [
    entry.siDo,
    entry.siGunGu,
    entry.eupMyeonDong,
    entry.ri,
  ].filter((segment): segment is string => typeof segment === 'string');
  const segmentVariants = new Set<string>();

  for (const segment of segments) {
    for (const variant of buildComparableVariants(segment)) {
      segmentVariants.add(variant);
    }
  }

  return {
    entry,
    leafVariants: buildComparableVariants(entry.leafLabel),
    pathComparable: normalizeComparable(entry.canonicalPath),
    segmentVariants,
  };
}

function getPreparedEntries(catalog: LocationCatalog): PreparedCatalogEntry[] {
  if (catalog === defaultCatalog) {
    return defaultPreparedEntries;
  }

  const cachedEntries = preparedEntriesCache.get(catalog);

  if (cachedEntries) {
    return cachedEntries;
  }

  const preparedEntries = catalog.entries.map(prepareCatalogEntry);
  preparedEntriesCache.set(catalog, preparedEntries);

  return preparedEntries;
}

function classifyMatch(
  queryComparable: string,
  queryVariants: Set<string>,
  preparedEntry: PreparedCatalogEntry
): MatchRank | null {
  for (const variant of queryVariants) {
    if (preparedEntry.leafVariants.has(variant)) {
      return MatchRank.ExactLeaf;
    }
  }

  for (const variant of queryVariants) {
    if (preparedEntry.segmentVariants.has(variant)) {
      return MatchRank.ExactSegment;
    }
  }

  if (preparedEntry.pathComparable.includes(queryComparable)) {
    return MatchRank.PathSubstring;
  }

  return null;
}

interface RankedPreparedEntry {
  matchRank: MatchRank;
  preparedEntry: PreparedCatalogEntry;
}

function comparePreparedEntries(
  left: RankedPreparedEntry,
  right: RankedPreparedEntry
): number {
  if (left.matchRank !== right.matchRank) {
    return left.matchRank - right.matchRank;
  }

  if (left.preparedEntry.entry.depth !== right.preparedEntry.entry.depth) {
    return left.preparedEntry.entry.depth - right.preparedEntry.entry.depth;
  }

  const canonicalPathComparison =
    left.preparedEntry.entry.canonicalPath.localeCompare(
      right.preparedEntry.entry.canonicalPath,
      'ko'
    );

  if (canonicalPathComparison !== 0) {
    return canonicalPathComparison;
  }

  return left.preparedEntry.entry.catalogLocationId.localeCompare(
    right.preparedEntry.entry.catalogLocationId,
    'en'
  );
}

function mapCatalogEntryToSearchResult(
  entry: CatalogEntry
): SearchCatalogResult {
  return {
    canonicalPath: entry.canonicalPath,
    catalogLocationId: entry.catalogLocationId,
    primaryLabel: entry.display.primaryLabel,
    secondaryPath: entry.display.secondaryLabel,
  };
}

export function searchCatalogLocations(
  query: string,
  catalog: LocationCatalog = defaultCatalog
): SearchCatalogResult[] {
  const queryComparable = normalizeComparable(query);

  if (!queryComparable) {
    return [];
  }

  const queryVariants = buildComparableVariants(query, false);

  return getPreparedEntries(catalog)
    .map((preparedEntry) => ({
      matchRank: classifyMatch(queryComparable, queryVariants, preparedEntry),
      preparedEntry,
    }))
    .filter((match): match is RankedPreparedEntry => match.matchRank !== null)
    .sort(comparePreparedEntries)
    .map(({ preparedEntry }) =>
      mapCatalogEntryToSearchResult(preparedEntry.entry)
    );
}

export function getCatalogLocationResultsByCanonicalPath(
  canonicalPaths: readonly string[],
  catalog: LocationCatalog = defaultCatalog
): SearchCatalogResult[] {
  const entriesByCanonicalPath = new Map(
    catalog.entries.map((entry) => [entry.canonicalPath, entry])
  );

  return canonicalPaths.flatMap((canonicalPath) => {
    const entry = entriesByCanonicalPath.get(canonicalPath);

    return entry ? [mapCatalogEntryToSearchResult(entry)] : [];
  });
}
