import { getLocalStorage } from '../../../shared/lib/storage/browser-storage';
import {
  storageKeys,
  storageSchemaVersion,
} from '../../../shared/lib/storage/storage-keys';
import type { StorageLike } from '../../../shared/lib/storage/storage-types';
import { createVersionedValueRepository } from '../../../shared/lib/storage/repositories/repository-utils';
import type { TemperatureUnit } from '../../../shared/lib/temperature';

export type MotionPreference = 'system' | 'reduced' | 'full';

export interface SettingsPreferences {
  temperatureUnit: TemperatureUnit;
  motionPreference: MotionPreference;
}

export const SETTINGS_DEFAULTS: SettingsPreferences = {
  motionPreference: 'system',
  temperatureUnit: 'C',
};

interface SettingsRepositoryOptions {
  storage?: StorageLike;
}

function isTemperatureUnit(value: unknown): value is TemperatureUnit {
  return value === 'C' || value === 'F';
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === 'system' || value === 'reduced' || value === 'full';
}

function isSettingsPreferences(value: unknown): value is SettingsPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const settings = value as Record<string, unknown>;
  const keys = Object.keys(settings);

  return (
    keys.length === 2 &&
    keys.includes('temperatureUnit') &&
    keys.includes('motionPreference') &&
    isTemperatureUnit(settings.temperatureUnit) &&
    isMotionPreference(settings.motionPreference)
  );
}

export function createSettingsRepository({
  storage,
}: SettingsRepositoryOptions = {}) {
  return createVersionedValueRepository<SettingsPreferences>({
    getDefaultStorage: getLocalStorage,
    getFallback: () => ({ ...SETTINGS_DEFAULTS }),
    key: storageKeys.settings,
    storage,
    validate: isSettingsPreferences,
    version: storageSchemaVersion,
  });
}
