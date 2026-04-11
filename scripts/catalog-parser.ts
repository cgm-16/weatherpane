// scripts/catalog-parser.ts
import { createHash } from 'node:crypto';
import type {
  CatalogEntry,
  CatalogDepth,
} from '../frontend/entities/location/model/catalog';

/**
 * Returns the first 12 hex characters of the SHA-256 hash of the NFC-normalized
 * canonical path. Deterministic, collision-free across all 20,556 Korea districts.
 */
export function computeCatalogLocationId(canonicalPath: string): string {
  const normalized = canonicalPath.normalize('NFC');
  return createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex')
    .slice(0, 12);
}

/**
 * Returns NFC-normalized tokens: [fullPath, seg1, seg2, ...].
 * Used by the search layer for instant matching.
 */
export function computeTokens(canonicalPath: string): string[] {
  const nfcPath = canonicalPath.normalize('NFC');
  const segments = canonicalPath.split('-').map((s) => s.normalize('NFC'));
  return [nfcPath, ...segments];
}

/**
 * Parses a single raw district string into a CatalogEntry.
 * Throws on empty string, empty segments, or depth outside [1, 4].
 */
export function parseCatalogEntry(rawPath: string): CatalogEntry {
  if (!rawPath) {
    throw new Error(`parseCatalogEntry: empty canonicalPath`);
  }

  const canonicalPath = rawPath.normalize('NFC');
  const segments = canonicalPath.split('-');

  if (segments.length > 4) {
    throw new Error(
      `parseCatalogEntry: depth ${segments.length} out of range [1,4] for "${canonicalPath}"`
    );
  }

  for (const seg of segments) {
    if (!seg) {
      throw new Error(`parseCatalogEntry: empty segment in "${canonicalPath}"`);
    }
  }

  const depth = segments.length as CatalogDepth;
  const [siDo, siGunGu, eupMyeonDong, ri] = segments;
  const leafLabel = segments[segments.length - 1];
  const secondaryLabel =
    depth === 1 ? null : segments.slice(0, segments.length - 1).join('-');

  return {
    catalogLocationId: computeCatalogLocationId(canonicalPath),
    canonicalPath,
    depth,
    siDo,
    ...(siGunGu !== undefined && { siGunGu }),
    ...(eupMyeonDong !== undefined && { eupMyeonDong }),
    ...(ri !== undefined && { ri }),
    leafLabel,
    tokens: computeTokens(canonicalPath),
    display: {
      primaryLabel: leafLabel,
      secondaryLabel,
    },
    archetypeKey: null,
    overrideKey: null,
  };
}

export interface PopularValidationResult {
  valid: string[];
  invalid: string[];
}

/**
 * Checks every path in popularPaths against the entries' canonical paths.
 * Returns { valid, invalid } arrays — caller decides whether to throw.
 */
export function validatePopularLocations(
  entries: CatalogEntry[],
  popularPaths: string[]
): PopularValidationResult {
  const canonicalSet = new Set(entries.map((e) => e.canonicalPath));
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const path of popularPaths) {
    if (canonicalSet.has(path)) {
      valid.push(path);
    } else {
      invalid.push(path);
    }
  }

  return { valid, invalid };
}
