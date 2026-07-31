import searchCatalogData from '../catalog.search.generated.json';

import {
  buildCatalogEntryFromParts,
  type GeneratedSearchCatalog,
  type GeneratedSearchEntry,
  type GeneratedSearchSegment,
} from './catalog-artifacts';
import type { CatalogEntry, LocationCatalog } from './catalog';
import { buildComparableVariants, normalizeComparable } from './location-match';

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

interface RankedPreparedEntry {
  matchRank: MatchRank;
  preparedEntry: PreparedCatalogEntry;
}

interface RankedGeneratedEntry {
  entry: GeneratedSearchEntry;
  index: number;
  matchRank: MatchRank;
}

enum MatchRank {
  ExactLeaf = 1,
  ExactSegment = 2,
  PathSubstring = 4,
}

const generatedSearchCatalog =
  searchCatalogData as unknown as GeneratedSearchCatalog;
const preparedEntriesCache = new WeakMap<
  LocationCatalog,
  PreparedCatalogEntry[]
>();

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
  const cachedEntries = preparedEntriesCache.get(catalog);

  if (cachedEntries) {
    return cachedEntries;
  }

  const preparedEntries = catalog.entries.map(prepareCatalogEntry);
  preparedEntriesCache.set(catalog, preparedEntries);

  return preparedEntries;
}

function classifyPreparedMatch(
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

function getGeneratedSegments(
  entry: GeneratedSearchEntry
): GeneratedSearchSegment[] {
  const segmentIndexes = entry.slice(4) as number[];

  return segmentIndexes.map(
    (segmentIndex) => generatedSearchCatalog.segments[segmentIndex]
  );
}

function getGeneratedCanonicalPath(entry: GeneratedSearchEntry): string {
  return getGeneratedSegments(entry)
    .map(([label]) => label)
    .join('-');
}

function mapGeneratedEntryToSearchResult(
  entry: GeneratedSearchEntry
): SearchCatalogResult {
  const segments = getGeneratedSegments(entry);
  const labels = segments.map(([label]) => label);

  return {
    canonicalPath: labels.join('-'),
    catalogLocationId: entry[0],
    primaryLabel: labels[labels.length - 1],
    secondaryPath: labels.length === 1 ? null : labels.slice(0, -1).join('-'),
  };
}

function classifyGeneratedMatch(
  queryComparable: string,
  entry: GeneratedSearchEntry
): MatchRank | null {
  const leafSegment =
    generatedSearchCatalog.segments[entry[entry.length - 1] as number];

  if (
    queryComparable === leafSegment[1] ||
    queryComparable === leafSegment[2]
  ) {
    return MatchRank.ExactLeaf;
  }

  for (let index = 4; index < entry.length; index += 1) {
    const [, comparable, omittedSuffixComparable] =
      generatedSearchCatalog.segments[entry[index] as number];

    if (
      queryComparable === comparable ||
      queryComparable === omittedSuffixComparable
    ) {
      return MatchRank.ExactSegment;
    }
  }

  return entry[1].includes(queryComparable) ? MatchRank.PathSubstring : null;
}

function compareGeneratedEntries(
  left: RankedGeneratedEntry,
  right: RankedGeneratedEntry
): number {
  if (left.matchRank !== right.matchRank) {
    return left.matchRank - right.matchRank;
  }

  const leftDepth = left.entry.length - 4;
  const rightDepth = right.entry.length - 4;
  if (leftDepth !== rightDepth) {
    return leftDepth - rightDepth;
  }

  return left.index - right.index;
}

function searchGeneratedCatalog(
  queryComparable: string
): SearchCatalogResult[] {
  const matches: RankedGeneratedEntry[] = [];

  for (const [index, entry] of generatedSearchCatalog.entries.entries()) {
    const matchRank = classifyGeneratedMatch(queryComparable, entry);

    if (matchRank !== null) {
      matches.push({ entry, index, matchRank });
    }
  }

  return matches
    .sort(compareGeneratedEntries)
    .map(({ entry }) => mapGeneratedEntryToSearchResult(entry));
}

function findGeneratedEntry(
  result: Pick<SearchCatalogResult, 'canonicalPath'> & {
    catalogLocationId?: string;
  }
): GeneratedSearchEntry | null {
  for (const entry of generatedSearchCatalog.entries) {
    if (
      (result.catalogLocationId === undefined ||
        entry[0] === result.catalogLocationId) &&
      getGeneratedCanonicalPath(entry) === result.canonicalPath
    ) {
      return entry;
    }
  }

  return null;
}

function buildCatalogEntryFromGeneratedEntry(
  entry: GeneratedSearchEntry
): CatalogEntry {
  return buildCatalogEntryFromParts(
    entry[0],
    getGeneratedCanonicalPath(entry),
    entry[2],
    entry[3]
  );
}

export function searchCatalogLocations(
  query: string,
  catalog?: LocationCatalog
): SearchCatalogResult[] {
  const queryComparable = normalizeComparable(query);

  if (!queryComparable) {
    return [];
  }

  if (!catalog) {
    return searchGeneratedCatalog(queryComparable);
  }

  const queryVariants = buildComparableVariants(query, false);

  return getPreparedEntries(catalog)
    .map((preparedEntry) => ({
      matchRank: classifyPreparedMatch(
        queryComparable,
        queryVariants,
        preparedEntry
      ),
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
  catalog?: LocationCatalog
): SearchCatalogResult[] {
  if (catalog) {
    const entriesByCanonicalPath = new Map(
      catalog.entries.map((entry) => [entry.canonicalPath, entry])
    );

    return canonicalPaths.flatMap((canonicalPath) => {
      const entry = entriesByCanonicalPath.get(canonicalPath);

      return entry ? [mapCatalogEntryToSearchResult(entry)] : [];
    });
  }

  return canonicalPaths.flatMap((canonicalPath) => {
    const entry = findGeneratedEntry({ canonicalPath });

    return entry ? [mapGeneratedEntryToSearchResult(entry)] : [];
  });
}

export function getCatalogEntryFromSearchResult(
  result: SearchCatalogResult
): CatalogEntry | null {
  const entry = findGeneratedEntry(result);

  return entry ? buildCatalogEntryFromGeneratedEntry(entry) : null;
}
