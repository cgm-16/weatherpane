import { describe, expect, test, vi } from 'vitest';

import type {
  CatalogLocation,
  ResolvedLocation,
  UnsupportedRouteContext,
} from '../frontend/entities/location/model/types';
import {
  buildResolvedLocationId,
  buildUnsupportedRouteToken,
  createCatalogLocationResolver,
  recoverUnsupportedRouteContext,
} from '../frontend/entities/location/model/location-resolution';
import { createUnsupportedRouteContextRepository } from '../frontend/shared/lib/storage/repositories/unsupported-route-context-repository';
import { createMemoryStorage } from './storage/test-storage';

function createCatalogLocation(
  overrides: Partial<CatalogLocation> = {}
): CatalogLocation {
  return {
    catalogLocationId: 'af6564d37582',
    name: '청운동',
    admin1: '서울특별시',
    admin2: '종로구',
    latitude: 37.5729,
    longitude: 126.9794,
    ...overrides,
  };
}

describe('location resolution helpers', () => {
  test('builds deterministic route ids for resolved and unsupported locations', () => {
    expect(buildResolvedLocationId('af6564d37582')).toBe('loc_af6564d37582');
    expect(buildUnsupportedRouteToken('af6564d37582')).toBe(
      'unsupported::af6564d37582'
    );
  });
});

describe('createCatalogLocationResolver', () => {
  test('prefers manual overrides before geocoding', async () => {
    const catalogLocation = createCatalogLocation();
    const geocode = vi.fn().mockResolvedValue([]);
    const storage = createMemoryStorage();
    const repository = createUnsupportedRouteContextRepository({ storage });
    const resolver = createCatalogLocationResolver({
      geocode,
      now: () => '2026-04-12T09:00:00+09:00',
      manualOverrides: {
        'seoul-jongno-cheongun': {
          admin1: '서울특별시',
          admin2: '종로구',
          latitude: 37.5842,
          longitude: 126.9707,
          name: '청운동',
          timezone: 'Asia/Seoul',
        },
      },
      unsupportedRouteContextRepository: repository,
    });

    const result = await resolver.resolveCatalogLocation({
      catalogLocation,
      canonicalPath: '서울특별시-종로구-청운동',
      overrideKey: 'seoul-jongno-cheongun',
    });

    expect(geocode).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'resolved',
      routeId: 'loc_af6564d37582',
      location: {
        kind: 'resolved',
        locationId: 'loc_af6564d37582',
        catalogLocationId: 'af6564d37582',
        name: '청운동',
        admin1: '서울특별시',
        admin2: '종로구',
        latitude: 37.5842,
        longitude: 126.9707,
        timezone: 'Asia/Seoul',
      } satisfies ResolvedLocation,
    });
  });

  test('filters geocoding candidates to Korea and chooses the best string match', async () => {
    const catalogLocation = createCatalogLocation();
    const storage = createMemoryStorage();
    const repository = createUnsupportedRouteContextRepository({ storage });
    const resolver = createCatalogLocationResolver({
      geocode: vi.fn().mockResolvedValue([
        {
          countryCode: 'JP',
          admin1: '도쿄도',
          admin2: '미나토구',
          latitude: 35.0,
          longitude: 139.0,
          name: '청운동',
          timezone: 'Asia/Tokyo',
        },
        {
          countryCode: 'KR',
          admin1: '서울특별시',
          admin2: '강남구',
          latitude: 37.5,
          longitude: 127.0,
          name: '청운동',
          timezone: 'Asia/Seoul',
        },
        {
          countryCode: 'KR',
          admin1: '서울특별시',
          admin2: '종로구',
          latitude: 37.5863,
          longitude: 126.9693,
          name: '청운동',
          timezone: 'Asia/Seoul',
        },
      ]),
      now: () => '2026-04-12T09:00:00+09:00',
      unsupportedRouteContextRepository: repository,
    });

    const result = await resolver.resolveCatalogLocation({
      catalogLocation,
      canonicalPath: '서울특별시-종로구-청운동',
    });

    expect(result).toEqual({
      kind: 'resolved',
      routeId: 'loc_af6564d37582',
      location: {
        kind: 'resolved',
        locationId: 'loc_af6564d37582',
        catalogLocationId: 'af6564d37582',
        name: '청운동',
        admin1: '서울특별시',
        admin2: '종로구',
        latitude: 37.5863,
        longitude: 126.9693,
        timezone: 'Asia/Seoul',
      } satisfies ResolvedLocation,
    });
  });

  test('stores unsupported route context and recovers it in the same session', async () => {
    const catalogLocation = createCatalogLocation({
      admin1: '강원특별자치도',
      catalogLocationId: 'e50058fbd673',
      latitude: 38.207,
      longitude: 128.5918,
      name: '속초시',
      admin2: undefined,
    });
    const storage = createMemoryStorage();
    const repository = createUnsupportedRouteContextRepository({ storage });
    const resolver = createCatalogLocationResolver({
      geocode: vi.fn().mockResolvedValue([
        {
          countryCode: 'JP',
          admin1: '홋카이도',
          admin2: '삿포로시',
          latitude: 43.0,
          longitude: 141.0,
          name: '속초시',
          timezone: 'Asia/Tokyo',
        },
      ]),
      now: () => '2026-04-12T09:15:00+09:00',
      unsupportedRouteContextRepository: repository,
    });

    const result = await resolver.resolveCatalogLocation({
      catalogLocation,
      canonicalPath: '강원특별자치도-속초시',
    });

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected unsupported location result');
    }
    expect(result.routeId).toBe('unsupported::e50058fbd673');
    expect(result.token).toBe('unsupported::e50058fbd673');
    expect(result.context).toEqual({
      token: 'unsupported::e50058fbd673',
      catalogLocation,
      createdAt: '2026-04-12T09:15:00+09:00',
    } satisfies UnsupportedRouteContext);
    expect(repository.get(result.token)).toEqual(result.context);
    expect(recoverUnsupportedRouteContext(result.routeId, repository)).toEqual(
      result.context
    );
  });

  test('queries OWM with leaf name and resolves depth-2 location via ExactLeaf match', async () => {
    const catalogLocation = createCatalogLocation({
      catalogLocationId: '9ce2db746e57',
      name: '성동구',
      admin1: '서울특별시',
      admin2: '성동구',
      latitude: 0,
      longitude: 0,
    });
    const geocodeMock = vi.fn().mockResolvedValue([
      {
        // OWM가 state를 영어로 반환하는 경우를 재현하여 ExactLeaf 경로를 검증
        countryCode: 'KR',
        name: '성동구',
        admin1: 'Seoul',
        latitude: 37.5633,
        longitude: 127.0371,
      },
    ]);
    const repository = createUnsupportedRouteContextRepository({
      storage: createMemoryStorage(),
    });
    const resolver = createCatalogLocationResolver({
      geocode: geocodeMock,
      now: () => '2026-04-14T09:00:00+09:00',
      unsupportedRouteContextRepository: repository,
    });

    const result = await resolver.resolveCatalogLocation({
      catalogLocation,
      canonicalPath: '서울특별시-성동구',
    });

    expect(geocodeMock).toHaveBeenCalledWith('성동구');
    expect(result.kind).toBe('resolved');
    if (result.kind === 'resolved') {
      expect(result.location.latitude).toBe(37.5633);
      expect(result.location.longitude).toBe(127.0371);
      // OWM가 영문 state를 반환해도 admin1은 카탈로그의 한국어 값을 사용해야 합니다.
      expect(result.location.admin1).toBe('서울특별시');
    }
  });

  test('returns unsupported results without creating resolved locations', async () => {
    const catalogLocation = createCatalogLocation({
      admin1: '부산광역시',
      admin2: '중구',
      catalogLocationId: '5f5def784f91',
      latitude: 35.1062,
      longitude: 129.0325,
      name: '중앙동',
    });
    const repository = createUnsupportedRouteContextRepository({
      storage: createMemoryStorage(),
    });
    const resolver = createCatalogLocationResolver({
      geocode: vi.fn().mockResolvedValue([]),
      now: () => '2026-04-12T09:20:00+09:00',
      unsupportedRouteContextRepository: repository,
    });

    const result = await resolver.resolveCatalogLocation({
      catalogLocation,
      canonicalPath: '부산광역시-중구-중앙동',
    });

    expect(result.kind).toBe('unsupported');
    expect('location' in result).toBe(false);
  });
});
