import { describe, expect, test } from 'vitest';

import type { PersistedAqiSnapshot } from '../../frontend/entities/aqi/model/persisted-aqi-snapshot';
import type { PersistedWeatherSnapshot } from '../../frontend/entities/weather/model/persisted-weather-snapshot';
import {
  createAqiSnapshotRepository,
  createWeatherSnapshotRepository,
} from '../../frontend/shared/lib/storage/repositories/snapshot-repositories';
import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import { createMemoryStorage } from './test-storage';

const weatherSnapshot: PersistedWeatherSnapshot = {
  conditionCode: 'CLOUDY',
  conditionText: '흐림',
  fetchedAt: '2026-04-11T11:00:00+09:00',
  locationId: 'loc_3f2c1a8b',
  observedAt: '2026-04-11T10:50:00+09:00',
  source: {
    provider: 'mock-weather',
  },
  temperatureC: 17.2,
  todayMaxC: 21.4,
  todayMinC: 12.1,
};

const aqiSnapshot: PersistedAqiSnapshot = {
  aqi: 41,
  category: 'good',
  fetchedAt: '2026-04-11T11:00:00+09:00',
  locationId: 'loc_3f2c1a8b',
  observedAt: '2026-04-11T10:45:00+09:00',
  source: {
    provider: 'mock-aqi',
  },
};

describe('snapshot repositories', () => {
  test('weather snapshot repository stores and removes snapshots by location id', () => {
    const repository = createWeatherSnapshotRepository({
      storage: createMemoryStorage(),
    });

    repository.set(weatherSnapshot.locationId, weatherSnapshot);
    expect(repository.get(weatherSnapshot.locationId)).toEqual(weatherSnapshot);

    repository.remove(weatherSnapshot.locationId);
    expect(repository.get(weatherSnapshot.locationId)).toBeNull();
  });

  test('aqi snapshot repository stores and removes snapshots by location id', () => {
    const repository = createAqiSnapshotRepository({
      storage: createMemoryStorage(),
    });

    repository.set(aqiSnapshot.locationId, aqiSnapshot);
    expect(repository.get(aqiSnapshot.locationId)).toEqual(aqiSnapshot);

    repository.remove(aqiSnapshot.locationId);
    expect(repository.get(aqiSnapshot.locationId)).toBeNull();
  });

  test('weather snapshot repository resets malformed array payloads', () => {
    const storage = createMemoryStorage();
    const repository = createWeatherSnapshotRepository({ storage });

    repository.set(weatherSnapshot.locationId, weatherSnapshot);
    storage.setItem(
      storageKeys.weatherSnapshots,
      JSON.stringify({
        data: [weatherSnapshot],
        version: 1,
      })
    );

    expect(repository.get(weatherSnapshot.locationId)).toBeNull();
    expect(storage.getItem(storageKeys.weatherSnapshots)).toBeNull();
  });

  test('aqi snapshot repository resets invalid snapshot shapes', () => {
    const storage = createMemoryStorage();
    const repository = createAqiSnapshotRepository({ storage });

    repository.set(aqiSnapshot.locationId, aqiSnapshot);
    storage.setItem(
      storageKeys.aqiSnapshots,
      JSON.stringify({
        data: {
          [aqiSnapshot.locationId]: {
            ...aqiSnapshot,
            category: 42,
          },
        },
        version: 1,
      })
    );

    expect(repository.get(aqiSnapshot.locationId)).toBeNull();
    expect(storage.getItem(storageKeys.aqiSnapshots)).toBeNull();
  });
});
