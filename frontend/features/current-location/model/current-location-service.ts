import {
  buildLocationComparablePath,
  buildResolvedLocation,
  type CatalogEntry,
  type CatalogLocation,
  type LocationGeocodeCandidate,
  type RawGpsFallbackLocation,
  type RawGpsFallbackReason,
  type ResolvedLocation,
} from '../../../entities/location';

export const CURRENT_LOCATION_TIMEOUT = 8_000;

export type CurrentLocationRecoveryReason =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout';

export type CurrentLocationResult =
  | {
      kind: 'resolved';
      location: ResolvedLocation;
    }
  | {
      kind: 'raw-gps';
      location: RawGpsFallbackLocation;
    }
  | {
      kind: 'recovery-required';
      reason: CurrentLocationRecoveryReason;
    };

interface CurrentLocationServiceOptions {
  catalogEntries: CatalogEntry[];
  geolocation: Pick<Geolocation, 'getCurrentPosition'>;
  now(): string;
  reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<LocationGeocodeCandidate[]>;
}

interface CanonicalMatch {
  candidate: LocationGeocodeCandidate;
  entry: CatalogEntry;
  rank: number;
}

const currentLocationLabel = '현재 위치';

function createCurrentLocationLookup(catalogEntries: CatalogEntry[]) {
  const lookup = new Map<string, CatalogEntry>();

  for (const entry of catalogEntries) {
    lookup.set(
      buildLocationComparablePath(entry.canonicalPath.split('-')),
      entry
    );
  }

  return lookup;
}

function toCountryCode(candidate: LocationGeocodeCandidate) {
  return candidate.countryCode?.toUpperCase();
}

function buildCatalogLocation(
  entry: CatalogEntry,
  latitude: number,
  longitude: number
): CatalogLocation {
  return {
    catalogLocationId: entry.catalogLocationId,
    name: entry.leafLabel,
    admin1: entry.siDo,
    ...(entry.depth >= 3 && entry.siGunGu ? { admin2: entry.siGunGu } : {}),
    latitude,
    longitude,
  };
}

function buildRawGpsFallbackLocation(
  latitude: number,
  longitude: number,
  capturedAt: string,
  fallbackReason: RawGpsFallbackReason
): RawGpsFallbackLocation {
  return {
    kind: 'raw-gps',
    locationId: `gps:${latitude.toFixed(4)}:${longitude.toFixed(4)}`,
    name: currentLocationLabel,
    latitude,
    longitude,
    capturedAt,
    fallbackReason,
  };
}

function mapGeolocationErrorToRecoveryReason(
  error: GeolocationPositionError
): CurrentLocationRecoveryReason {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'permission-denied';
    case error.TIMEOUT:
      return 'timeout';
    case error.POSITION_UNAVAILABLE:
    default:
      return 'position-unavailable';
  }
}

function loadCurrentPosition(
  geolocation: Pick<Geolocation, 'getCurrentPosition'>
) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, {
      timeout: CURRENT_LOCATION_TIMEOUT,
    });
  });
}

function findBestCanonicalMatch(
  candidates: LocationGeocodeCandidate[],
  lookup: Map<string, CatalogEntry>
) {
  let bestMatch: CanonicalMatch | null = null;

  for (const candidate of candidates) {
    if (toCountryCode(candidate) !== 'KR') {
      continue;
    }

    const candidatePaths = [
      {
        parts: [candidate.admin1, candidate.admin2, candidate.name],
        rank: 3,
      },
      {
        parts: [candidate.admin1, candidate.admin2],
        rank: 2,
      },
      {
        parts: [candidate.admin1],
        rank: 1,
      },
    ] as const;

    for (const candidatePath of candidatePaths) {
      const comparablePath = buildLocationComparablePath([
        ...candidatePath.parts,
      ]);

      if (!comparablePath) {
        continue;
      }

      const entry = lookup.get(comparablePath);

      if (!entry) {
        continue;
      }

      const effectiveRank = candidatePath.parts.filter(Boolean).length;

      if (!bestMatch || effectiveRank > bestMatch.rank) {
        bestMatch = {
          candidate,
          entry,
          rank: effectiveRank,
        };
      }

      break;
    }
  }

  return bestMatch;
}

function isOutsideKorea(candidates: LocationGeocodeCandidate[]) {
  return (
    candidates.length > 0 &&
    !candidates.some((candidate) => toCountryCode(candidate) === 'KR') &&
    candidates.some((candidate) => {
      const countryCode = toCountryCode(candidate);

      return Boolean(countryCode && countryCode !== 'KR');
    })
  );
}

export function createCurrentLocationService({
  catalogEntries,
  geolocation,
  now,
  reverseGeocode,
}: CurrentLocationServiceOptions) {
  const lookup = createCurrentLocationLookup(catalogEntries);

  return {
    async locateCurrentLocation(): Promise<CurrentLocationResult> {
      let position: GeolocationPosition;

      try {
        position = await loadCurrentPosition(geolocation);
      } catch (error) {
        return {
          kind: 'recovery-required',
          reason: mapGeolocationErrorToRecoveryReason(
            error as GeolocationPositionError
          ),
        };
      }

      const { latitude, longitude } = position.coords;
      const capturedAt = now();
      let candidates: LocationGeocodeCandidate[];
      try {
        candidates = await reverseGeocode(latitude, longitude);
      } catch {
        candidates = [] as LocationGeocodeCandidate[];
      }

      const bestMatch = findBestCanonicalMatch(candidates, lookup);

      if (bestMatch) {
        const catalogLocation = buildCatalogLocation(
          bestMatch.entry,
          latitude,
          longitude
        );

        return {
          kind: 'resolved',
          location: buildResolvedLocation(catalogLocation, {
            name: catalogLocation.name,
            admin1: catalogLocation.admin1,
            ...(catalogLocation.admin2
              ? { admin2: catalogLocation.admin2 }
              : {}),
            latitude,
            longitude,
            timezone: bestMatch.candidate.timezone ?? 'Asia/Seoul',
          }),
        };
      }

      return {
        kind: 'raw-gps',
        location: buildRawGpsFallbackLocation(
          latitude,
          longitude,
          capturedAt,
          isOutsideKorea(candidates)
            ? 'outside-korea'
            : 'canonicalization-failed'
        ),
      };
    },
  };
}
