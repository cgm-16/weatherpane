import type { CatalogEntry, CatalogDepth } from './catalog';
import { buildComparableVariants, normalizeComparable } from './location-match';

export type GeneratedSearchSegment = readonly [
  label: string,
  comparable: string,
  omittedSuffixComparable: string | null,
];

export type GeneratedSearchEntry = readonly [
  catalogLocationId: string,
  pathComparable: string,
  archetypeKey: string | null,
  overrideKey: string | null,
  ...segmentIndexes: number[],
];

export interface GeneratedSearchCatalog {
  version: string;
  total: number;
  segments: GeneratedSearchSegment[];
  entries: GeneratedSearchEntry[];
}

export type GeneratedCatalogLookupEntry = readonly [
  canonicalPath: string,
  archetypeKey: string | null,
  overrideKey: string | null,
];

export interface GeneratedCatalogLookup {
  version: string;
  total: number;
  ids: string;
  entries: GeneratedCatalogLookupEntry[];
}

const catalogLocationIdPattern = /^[0-9a-f]{12}$/;

function assertCatalogLocationId(catalogLocationId: string) {
  if (!catalogLocationIdPattern.test(catalogLocationId)) {
    throw new Error(
      `catalog-artifacts: invalid catalogLocationId "${catalogLocationId}"`
    );
  }
}

function getSegments(entry: CatalogEntry): string[] {
  return [entry.siDo, entry.siGunGu, entry.eupMyeonDong, entry.ri].filter(
    (segment): segment is string => segment !== undefined
  );
}

export function buildCatalogEntryFromParts(
  catalogLocationId: string,
  canonicalPath: string,
  archetypeKey: string | null,
  overrideKey: string | null
): CatalogEntry {
  assertCatalogLocationId(catalogLocationId);

  const normalizedPath = canonicalPath.normalize('NFC');
  const segments = normalizedPath.split('-');
  const depth = segments.length as CatalogDepth;
  const [siDo, siGunGu, eupMyeonDong, ri] = segments;
  const leafLabel = segments[segments.length - 1];

  return {
    catalogLocationId,
    canonicalPath: normalizedPath,
    depth,
    siDo,
    ...(siGunGu !== undefined && { siGunGu }),
    ...(eupMyeonDong !== undefined && { eupMyeonDong }),
    ...(ri !== undefined && { ri }),
    leafLabel,
    tokens: [normalizedPath, ...segments],
    display: {
      primaryLabel: leafLabel,
      secondaryLabel:
        depth === 1 ? null : segments.slice(0, segments.length - 1).join('-'),
    },
    archetypeKey,
    overrideKey,
  };
}

export function buildGeneratedSearchCatalog(
  entries: CatalogEntry[]
): GeneratedSearchCatalog {
  const segments: GeneratedSearchSegment[] = [];
  const indexesByLabel = new Map<string, number>();

  const getSegmentIndex = (label: string) => {
    const normalizedLabel = label.normalize('NFC');
    const existingIndex = indexesByLabel.get(normalizedLabel);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    const [comparable, omittedSuffixComparable] = [
      ...buildComparableVariants(normalizedLabel),
    ];
    const index = segments.length;
    segments.push([
      normalizedLabel,
      comparable,
      omittedSuffixComparable ?? null,
    ]);
    indexesByLabel.set(normalizedLabel, index);
    return index;
  };

  const sortedEntries = [...entries].sort(
    (left, right) =>
      left.canonicalPath.localeCompare(right.canonicalPath, 'ko') ||
      left.catalogLocationId.localeCompare(right.catalogLocationId, 'en')
  );

  return {
    version: '1',
    total: entries.length,
    segments,
    entries: sortedEntries.map((entry) => {
      assertCatalogLocationId(entry.catalogLocationId);
      return [
        entry.catalogLocationId,
        normalizeComparable(entry.canonicalPath),
        entry.archetypeKey,
        entry.overrideKey,
        ...getSegments(entry).map(getSegmentIndex),
      ];
    }),
  };
}

export function buildGeneratedCatalogLookup(
  entries: CatalogEntry[]
): GeneratedCatalogLookup {
  for (const entry of entries) {
    assertCatalogLocationId(entry.catalogLocationId);
  }

  return {
    version: '1',
    total: entries.length,
    ids: entries.map((entry) => entry.catalogLocationId).join(''),
    entries: entries.map((entry) => [
      entry.canonicalPath,
      entry.archetypeKey,
      entry.overrideKey,
    ]),
  };
}
