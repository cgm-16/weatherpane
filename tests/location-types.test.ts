import { describe, expect, test } from 'vitest';

import {
  isActiveLocation,
  isFavoriteLocation,
  isRawGpsFallbackLocation,
  isRecentLocation,
  isUnsupportedRouteContext,
} from '../frontend/entities/location/model/types';

const catalogLocation = {
  admin1: '서울특별시',
  admin2: '종로구',
  catalogLocationId: 'catalog:seoul-jongno',
  latitude: 37.5729,
  longitude: 126.9794,
  name: '서울 종로구',
};

const resolvedLocation = {
  ...catalogLocation,
  kind: 'resolved' as const,
  locationId: 'loc_3f2c1a8b',
  timezone: 'Asia/Seoul',
};

const rawGpsLocation = {
  capturedAt: '2026-04-11T09:00:00+09:00',
  kind: 'raw-gps' as const,
  latitude: 37.5665,
  locationId: 'gps:37.5665:126.9780',
  longitude: 126.978,
  name: '현재 위치',
};

const favoriteLocation = {
  createdAt: '2026-04-11T09:00:00+09:00',
  favoriteId: 'fav_1',
  location: resolvedLocation,
  nickname: '회사',
  order: 0,
  updatedAt: '2026-04-11T09:30:00+09:00',
};

describe('location type guards', () => {
  test('reject raw-gps and recent locations with non-ISO timestamps', () => {
    expect(
      isRawGpsFallbackLocation({
        ...rawGpsLocation,
        capturedAt: '2026-04-11 09:00:00',
      })
    ).toBe(false);

    expect(
      isRecentLocation({
        lastOpenedAt: 'not-a-date',
        location: resolvedLocation,
      })
    ).toBe(false);
  });

  test('reject active and unsupported route contexts with non-ISO timestamps', () => {
    expect(
      isActiveLocation({
        changedAt: '2026/04/11 10:10:00',
        kind: 'resolved',
        location: resolvedLocation,
        source: 'search',
      })
    ).toBe(false);

    expect(
      isUnsupportedRouteContext({
        catalogLocation,
        createdAt: '2026-02-30T00:00:00+09:00',
        token: 'unsupported::catalog:sokcho',
      })
    ).toBe(false);
  });

  test('reject favorites with non-ISO timestamps', () => {
    expect(
      isFavoriteLocation({
        ...favoriteLocation,
        createdAt: '2026-04-11 09:00:00',
      })
    ).toBe(false);

    expect(
      isFavoriteLocation({
        ...favoriteLocation,
        updatedAt: 'invalid-date',
      })
    ).toBe(false);
  });

  test('reject favorites with negative or fractional order', () => {
    expect(
      isFavoriteLocation({
        ...favoriteLocation,
        order: -1,
      })
    ).toBe(false);

    expect(
      isFavoriteLocation({
        ...favoriteLocation,
        order: 1.5,
      })
    ).toBe(false);
  });

  test('accept valid ISO timestamps and non-negative integer order', () => {
    expect(isRawGpsFallbackLocation(rawGpsLocation)).toBe(true);
    expect(
      isRecentLocation({
        lastOpenedAt: '2026-04-11T10:00:00+09:00',
        location: resolvedLocation,
      })
    ).toBe(true);
    expect(
      isActiveLocation({
        changedAt: '2026-04-11T10:10:00+09:00',
        kind: 'resolved',
        location: resolvedLocation,
        source: 'search',
      })
    ).toBe(true);
    expect(
      isUnsupportedRouteContext({
        catalogLocation,
        createdAt: '2026-04-11T11:20:00+09:00',
        token: 'unsupported::catalog:sokcho',
      })
    ).toBe(true);
    expect(isFavoriteLocation(favoriteLocation)).toBe(true);
  });
});
