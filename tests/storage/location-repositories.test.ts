import { describe, expect, test } from 'vitest';

import type {
  ActiveLocation,
  CatalogLocation,
  FavoriteLocation,
  RawGpsFallbackLocation,
  RecentLocation,
  ResolvedLocation,
} from '../../frontend/entities/location/model/types';
import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import {
  createActiveLocationRepository,
  createFavoritesRepository,
  createRecentsRepository,
} from '../../frontend/shared/lib/storage/repositories/location-repositories';
import { createMemoryStorage } from './test-storage';

const catalogLocation: CatalogLocation = {
  admin1: '서울특별시',
  admin2: '종로구',
  catalogLocationId: 'catalog:seoul-jongno',
  latitude: 37.5729,
  longitude: 126.9794,
  name: '서울 종로구',
};

const resolvedLocation: ResolvedLocation = {
  admin1: catalogLocation.admin1,
  admin2: catalogLocation.admin2,
  catalogLocationId: catalogLocation.catalogLocationId,
  kind: 'resolved',
  latitude: catalogLocation.latitude,
  locationId: 'loc_3f2c1a8b',
  longitude: catalogLocation.longitude,
  name: catalogLocation.name,
  timezone: 'Asia/Seoul',
};

const rawGpsLocation: RawGpsFallbackLocation = {
  capturedAt: '2026-04-11T09:00:00+09:00',
  fallbackReason: 'canonicalization-failed',
  kind: 'raw-gps',
  latitude: 37.5665,
  locationId: 'gps:37.5665:126.9780',
  longitude: 126.978,
  name: '현재 위치',
};

const favoriteLocation: FavoriteLocation = {
  createdAt: '2026-04-11T09:00:00+09:00',
  favoriteId: 'fav_1',
  location: resolvedLocation,
  nickname: '회사',
  order: 0,
  updatedAt: '2026-04-11T09:30:00+09:00',
};

const recents: RecentLocation[] = [
  {
    lastOpenedAt: '2026-04-11T10:00:00+09:00',
    location: resolvedLocation,
  },
  {
    lastOpenedAt: '2026-04-11T10:05:00+09:00',
    location: rawGpsLocation,
  },
];

const resolvedActiveLocation: ActiveLocation = {
  changedAt: '2026-04-11T10:10:00+09:00',
  kind: 'resolved',
  location: resolvedLocation,
  source: 'search',
};

const rawGpsActiveLocation: ActiveLocation = {
  changedAt: '2026-04-11T10:15:00+09:00',
  kind: 'raw-gps',
  location: rawGpsLocation,
  source: 'current-location',
};

describe('location repositories', () => {
  test('favorites repository round-trips persisted favorites', () => {
    const storage = createMemoryStorage();
    const repository = createFavoritesRepository({ storage });

    repository.replaceAll([favoriteLocation]);

    expect(repository.getAll()).toEqual([favoriteLocation]);
  });

  test('recents repository round-trips both resolved and raw-gps entries', () => {
    const storage = createMemoryStorage();
    const repository = createRecentsRepository({ storage });

    repository.replaceAll(recents);

    expect(repository.getAll()).toEqual(recents);
  });

  test('active-location repository round-trips resolved and raw-gps values', () => {
    const storage = createMemoryStorage();
    const repository = createActiveLocationRepository({ storage });

    repository.set(resolvedActiveLocation);
    expect(repository.get()).toEqual(resolvedActiveLocation);

    repository.set(rawGpsActiveLocation);
    expect(repository.get()).toEqual(rawGpsActiveLocation);
  });

  test('favorites repository discards invalid payloads and resets storage', () => {
    const storage = createMemoryStorage();
    const repository = createFavoritesRepository({ storage });

    storage.setItem(
      storageKeys.favorites,
      '{"version":1,"data":{"broken":true}}'
    );

    expect(repository.getAll()).toEqual([]);
    expect(storage.getItem(storageKeys.favorites)).toBeNull();
  });

  test('favorites repository resets favorites with overlong nicknames', () => {
    const storage = createMemoryStorage();
    const repository = createFavoritesRepository({ storage });

    storage.setItem(
      storageKeys.favorites,
      JSON.stringify({
        data: [
          {
            ...favoriteLocation,
            nickname: '가'.repeat(21),
          },
        ],
        version: 1,
      })
    );

    expect(repository.getAll()).toEqual([]);
    expect(storage.getItem(storageKeys.favorites)).toBeNull();
  });
});
