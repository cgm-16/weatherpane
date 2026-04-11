import { isPersistedAqiSnapshot } from '../../../../entities/aqi/model/persisted-aqi-snapshot';
import { isPersistedWeatherSnapshot } from '../../../../entities/weather/model/persisted-weather-snapshot';
import { getLocalStorage } from '../browser-storage';
import { storageKeys, storageSchemaVersion } from '../storage-keys';
import type { StorageLike } from '../storage-types';
import { createVersionedRecordRepository } from './repository-utils';

interface SnapshotRepositoryOptions {
  storage?: StorageLike;
}

export function createWeatherSnapshotRepository({
  storage,
}: SnapshotRepositoryOptions = {}) {
  return createVersionedRecordRepository({
    getDefaultStorage: getLocalStorage,
    key: storageKeys.weatherSnapshots,
    storage,
    validateValue: isPersistedWeatherSnapshot,
    version: storageSchemaVersion,
  });
}

export function createAqiSnapshotRepository({
  storage,
}: SnapshotRepositoryOptions = {}) {
  return createVersionedRecordRepository({
    getDefaultStorage: getLocalStorage,
    key: storageKeys.aqiSnapshots,
    storage,
    validateValue: isPersistedAqiSnapshot,
    version: storageSchemaVersion,
  });
}
