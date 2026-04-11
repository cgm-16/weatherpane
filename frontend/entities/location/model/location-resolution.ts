import type {
  CatalogLocation,
  ResolvedLocation,
  UnsupportedRouteContext,
} from './types';
import {
  buildLocationComparablePath,
  normalizeComparable,
} from './location-match';

export interface LocationGeocodeCandidate {
  name: string;
  admin1?: string;
  admin2?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface ManualLocationOverride {
  name: string;
  admin1: string;
  admin2?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CatalogLocationResolutionInput {
  catalogLocation: CatalogLocation;
  canonicalPath?: string;
  overrideKey?: string | null;
}

export type LocationResolutionResult =
  | {
      kind: 'resolved';
      routeId: string;
      location: ResolvedLocation;
    }
  | {
      kind: 'unsupported';
      routeId: string;
      token: string;
      context: UnsupportedRouteContext;
    };

export interface UnsupportedRouteContextRepository {
  get(token: string): UnsupportedRouteContext | null;
  set(context: UnsupportedRouteContext): void;
}

interface CatalogLocationResolverOptions {
  geocode(query: string): Promise<LocationGeocodeCandidate[]>;
  manualOverrides?: Record<string, ManualLocationOverride>;
  now(): string;
  unsupportedRouteContextRepository: UnsupportedRouteContextRepository;
}

enum GeocodeCandidateMatchRank {
  ExactPath = 1,
  ExactLeaf = 2,
  PathSubstring = 3,
}

function buildCatalogLocationPath(
  catalogLocation: CatalogLocation,
  canonicalPath?: string
) {
  return (
    canonicalPath ??
    [catalogLocation.admin1, catalogLocation.admin2, catalogLocation.name]
      .filter(Boolean)
      .join('-')
  );
}

function buildResolvedLocation(
  catalogLocation: CatalogLocation,
  fields: ManualLocationOverride | LocationGeocodeCandidate
): ResolvedLocation {
  return {
    kind: 'resolved',
    locationId: buildResolvedLocationId(catalogLocation.catalogLocationId),
    catalogLocationId: catalogLocation.catalogLocationId,
    name: fields.name,
    admin1: fields.admin1 ?? catalogLocation.admin1,
    ...(fields.admin2 ? { admin2: fields.admin2 } : {}),
    latitude: fields.latitude,
    longitude: fields.longitude,
    timezone: fields.timezone ?? 'Asia/Seoul',
  };
}

function classifyGeocodeCandidate(
  targetPathComparable: string,
  targetLeafComparable: string,
  candidate: LocationGeocodeCandidate
): GeocodeCandidateMatchRank | null {
  const candidatePathComparable = buildLocationComparablePath([
    candidate.admin1,
    candidate.admin2,
    candidate.name,
  ]);
  const candidateLeafComparable = normalizeComparable(candidate.name);

  if (!candidatePathComparable || !candidateLeafComparable) {
    return null;
  }

  if (candidatePathComparable === targetPathComparable) {
    return GeocodeCandidateMatchRank.ExactPath;
  }

  if (candidateLeafComparable === targetLeafComparable) {
    return GeocodeCandidateMatchRank.ExactLeaf;
  }

  if (
    candidatePathComparable.includes(targetPathComparable) ||
    targetPathComparable.includes(candidatePathComparable)
  ) {
    return GeocodeCandidateMatchRank.PathSubstring;
  }

  return null;
}

function pickBestGeocodeCandidate(
  targetPath: string,
  targetLeaf: string,
  candidates: LocationGeocodeCandidate[]
) {
  const targetPathComparable = normalizeComparable(targetPath);
  const targetLeafComparable = normalizeComparable(targetLeaf);
  let bestCandidate: LocationGeocodeCandidate | null = null;
  let bestRank: GeocodeCandidateMatchRank | null = null;

  for (const candidate of candidates) {
    if (candidate.countryCode?.toUpperCase() !== 'KR') {
      continue;
    }

    const rank = classifyGeocodeCandidate(
      targetPathComparable,
      targetLeafComparable,
      candidate
    );

    if (rank === null) {
      continue;
    }

    if (bestRank === null || rank < bestRank) {
      bestCandidate = candidate;
      bestRank = rank;
    }
  }

  return bestCandidate;
}

export function buildResolvedLocationId(catalogLocationId: string) {
  return `loc_${catalogLocationId}`;
}

export function buildUnsupportedRouteToken(catalogLocationId: string) {
  return `unsupported::${catalogLocationId}`;
}

export function isUnsupportedRouteToken(routeId: string) {
  return routeId.startsWith('unsupported::');
}

export function recoverUnsupportedRouteContext(
  routeId: string,
  repository: UnsupportedRouteContextRepository
) {
  if (!isUnsupportedRouteToken(routeId)) {
    return null;
  }

  return repository.get(routeId);
}

export function createCatalogLocationResolver({
  geocode,
  manualOverrides = {},
  now,
  unsupportedRouteContextRepository,
}: CatalogLocationResolverOptions) {
  return {
    async resolveCatalogLocation({
      catalogLocation,
      canonicalPath,
      overrideKey,
    }: CatalogLocationResolutionInput): Promise<LocationResolutionResult> {
      const override =
        manualOverrides[overrideKey ?? catalogLocation.catalogLocationId];

      if (override) {
        const location = buildResolvedLocation(catalogLocation, override);

        return {
          kind: 'resolved',
          routeId: location.locationId,
          location,
        };
      }

      const geocodeCandidates = await geocode(
        buildCatalogLocationPath(catalogLocation, canonicalPath)
      );
      const bestCandidate = pickBestGeocodeCandidate(
        buildCatalogLocationPath(catalogLocation, canonicalPath),
        catalogLocation.name,
        geocodeCandidates
      );

      if (bestCandidate) {
        const location = buildResolvedLocation(catalogLocation, bestCandidate);

        return {
          kind: 'resolved',
          routeId: location.locationId,
          location,
        };
      }

      const token = buildUnsupportedRouteToken(
        catalogLocation.catalogLocationId
      );
      const context = {
        token,
        catalogLocation,
        createdAt: now(),
      } satisfies UnsupportedRouteContext;

      unsupportedRouteContextRepository.set(context);

      return {
        kind: 'unsupported',
        routeId: token,
        token,
        context,
      };
    },
  };
}
