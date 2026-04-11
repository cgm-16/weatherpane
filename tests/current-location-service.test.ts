import { describe, expect, test, vi } from 'vitest';

import type {
  CatalogDepth,
  CatalogEntry,
} from '../frontend/entities/location/model/catalog';
import type { LocationGeocodeCandidate } from '../frontend/entities/location/model/location-resolution';
import { createCurrentLocationService } from '../frontend/features/current-location';

function createCatalogEntry(
  canonicalPath: string,
  catalogLocationId: string
): CatalogEntry {
  const segments = canonicalPath.split('-');
  const depth = segments.length as CatalogDepth;
  const [siDo, siGunGu, eupMyeonDong, ri] = segments;

  return {
    catalogLocationId,
    canonicalPath,
    depth,
    siDo,
    ...(siGunGu ? { siGunGu } : {}),
    ...(eupMyeonDong ? { eupMyeonDong } : {}),
    ...(ri ? { ri } : {}),
    leafLabel: segments.at(-1) ?? siDo,
    tokens: [canonicalPath, ...segments],
    display: {
      primaryLabel: segments.at(-1) ?? siDo,
      secondaryLabel:
        segments.length > 1 ? segments.slice(0, -1).join('-') : null,
    },
    archetypeKey: null,
    overrideKey: null,
  };
}

function createPosition(
  overrides: Partial<GeolocationCoordinates> = {}
): GeolocationPosition {
  return {
    coords: {
      accuracy: 15,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: 37.5665,
      longitude: 126.978,
      speed: null,
      toJSON: () => ({}),
      ...overrides,
    },
    timestamp: Date.parse('2026-04-12T09:00:00+09:00'),
    toJSON: () => ({}),
  };
}

function createGeolocationError(
  code: 1 | 2 | 3,
  message: string
): GeolocationPositionError {
  return {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

function createKoreaCandidate(
  overrides: Partial<LocationGeocodeCandidate> = {}
): LocationGeocodeCandidate {
  return {
    countryCode: 'KR',
    name: '청운동',
    admin1: '서울특별시',
    admin2: '종로구',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
    ...overrides,
  };
}

describe('createCurrentLocationService', () => {
  test('uses getCurrentPosition once with an 8-second timeout and default accuracy behavior', async () => {
    const getCurrentPosition = vi.fn(
      (
        _success: PositionCallback,
        error?: PositionErrorCallback | null,
        options?: PositionOptions
      ) => {
        error?.(createGeolocationError(3, 'timeout'));
        expect(options).toEqual({ timeout: 8_000 });
      }
    );
    const service = createCurrentLocationService({
      catalogEntries: [],
      geolocation: { getCurrentPosition },
      now: () => '2026-04-12T09:00:00+09:00',
      reverseGeocode: vi.fn(),
    });

    const result = await service.locateCurrentLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      kind: 'recovery-required',
      reason: 'timeout',
    });
  });

  test.each([
    [1, 'permission-denied'],
    [2, 'position-unavailable'],
  ] as const)(
    'maps geolocation error code %s to a %s recovery state',
    async (code, reason) => {
      const reverseGeocode = vi.fn();
      const service = createCurrentLocationService({
        catalogEntries: [],
        geolocation: {
          getCurrentPosition: (
            _success: PositionCallback,
            error?: PositionErrorCallback | null
          ) => {
            error?.(createGeolocationError(code, reason));
          },
        },
        now: () => '2026-04-12T09:00:00+09:00',
        reverseGeocode,
      });

      const result = await service.locateCurrentLocation();

      expect(reverseGeocode).not.toHaveBeenCalled();
      expect(result).toEqual({
        kind: 'recovery-required',
        reason,
      });
    }
  );

  test('prefers the deepest supported Korea canonical location and falls back by depth when needed', async () => {
    const geolocation = {
      getCurrentPosition: (success: PositionCallback) => {
        success(createPosition());
      },
    };
    const reverseGeocode = vi.fn().mockResolvedValue([createKoreaCandidate()]);

    const fullDepthService = createCurrentLocationService({
      catalogEntries: [
        createCatalogEntry('서울특별시', 'sido'),
        createCatalogEntry('서울특별시-종로구', 'gugun'),
        createCatalogEntry('서울특별시-종로구-청운동', 'dong'),
      ],
      geolocation,
      now: () => '2026-04-12T09:00:00+09:00',
      reverseGeocode,
    });
    const guGunFallbackService = createCurrentLocationService({
      catalogEntries: [
        createCatalogEntry('서울특별시', 'sido'),
        createCatalogEntry('서울특별시-종로구', 'gugun'),
      ],
      geolocation,
      now: () => '2026-04-12T09:00:00+09:00',
      reverseGeocode,
    });

    await expect(fullDepthService.locateCurrentLocation()).resolves.toEqual({
      kind: 'resolved',
      location: {
        kind: 'resolved',
        locationId: 'loc_dong',
        catalogLocationId: 'dong',
        name: '청운동',
        admin1: '서울특별시',
        admin2: '종로구',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
    });
    await expect(guGunFallbackService.locateCurrentLocation()).resolves.toEqual(
      {
        kind: 'resolved',
        location: {
          kind: 'resolved',
          locationId: 'loc_gugun',
          catalogLocationId: 'gugun',
          name: '종로구',
          admin1: '서울특별시',
          latitude: 37.5665,
          longitude: 126.978,
          timezone: 'Asia/Seoul',
        },
      }
    );
  });

  test('creates a raw GPS fallback when a Korea reverse-geocode result cannot be canonicalized', async () => {
    const service = createCurrentLocationService({
      catalogEntries: [
        createCatalogEntry('서울특별시-강남구-역삼동', 'yeoksam'),
      ],
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success(createPosition());
        },
      },
      now: () => '2026-04-12T09:00:00+09:00',
      reverseGeocode: vi
        .fn()
        .mockResolvedValue([
          createKoreaCandidate({ name: '청운동', admin2: '종로구' }),
        ]),
    });

    await expect(service.locateCurrentLocation()).resolves.toEqual({
      kind: 'raw-gps',
      location: {
        kind: 'raw-gps',
        locationId: 'gps:37.5665:126.9780',
        name: '현재 위치',
        latitude: 37.5665,
        longitude: 126.978,
        capturedAt: '2026-04-12T09:00:00+09:00',
        fallbackReason: 'canonicalization-failed',
      },
    });
  });

  test('creates an outside-Korea raw GPS fallback that remains distinguishable from Korea canonicalization failures', async () => {
    const service = createCurrentLocationService({
      catalogEntries: [createCatalogEntry('서울특별시-종로구-청운동', 'dong')],
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success(createPosition({ latitude: 35.6762, longitude: 139.6503 }));
        },
      },
      now: () => '2026-04-12T09:05:00+09:00',
      reverseGeocode: vi.fn().mockResolvedValue([
        {
          countryCode: 'JP',
          name: '千代田区',
          admin1: '東京都',
          admin2: '千代田区',
          latitude: 35.6762,
          longitude: 139.6503,
          timezone: 'Asia/Tokyo',
        },
      ]),
    });

    await expect(service.locateCurrentLocation()).resolves.toEqual({
      kind: 'raw-gps',
      location: {
        kind: 'raw-gps',
        locationId: 'gps:35.6762:139.6503',
        name: '현재 위치',
        latitude: 35.6762,
        longitude: 139.6503,
        capturedAt: '2026-04-12T09:05:00+09:00',
        fallbackReason: 'outside-korea',
      },
    });
  });
});
