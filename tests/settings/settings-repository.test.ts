import { describe, expect, test } from 'vitest';

import {
  SETTINGS_DEFAULTS,
  createSettingsRepository,
} from '../../frontend/features/settings/model/settings-repository';
import {
  storageKeys,
  storageSchemaVersion,
} from '../../frontend/shared/lib/storage/storage-keys';
import { createMemoryStorage } from '../storage/test-storage';

describe('settings repository', () => {
  test('uses the versioned settings storage key', () => {
    expect(storageKeys.settings).toBe('weatherpane.settings.v1');
  });

  test('returns C and system preferences when nothing is stored', () => {
    const repository = createSettingsRepository({
      storage: createMemoryStorage(),
    });

    expect(repository.get()).toEqual({
      motionPreference: 'system',
      temperatureUnit: 'C',
    });
  });

  test('returns a fresh default preferences object on each read', () => {
    const repository = createSettingsRepository({
      storage: createMemoryStorage(),
    });

    expect(repository.get()).not.toBe(SETTINGS_DEFAULTS);
    expect(repository.get()).not.toBe(repository.get());
  });

  test('round-trips valid temperature and motion preferences', () => {
    const storage = createMemoryStorage();
    const repository = createSettingsRepository({ storage });

    repository.set({
      motionPreference: 'full',
      temperatureUnit: 'F',
    });

    expect(repository.get()).toEqual({
      motionPreference: 'full',
      temperatureUnit: 'F',
    });
    expect(storage.getItem(storageKeys.settings)).toBe(
      JSON.stringify({
        data: {
          motionPreference: 'full',
          temperatureUnit: 'F',
        },
        version: storageSchemaVersion,
      })
    );
  });

  test('removes only the settings key when its payload shape is invalid', () => {
    const storage = createMemoryStorage();
    const repository = createSettingsRepository({ storage });

    storage.setItem('unrelated.key', 'preserve me');
    storage.setItem(
      storageKeys.settings,
      JSON.stringify({
        data: {
          extraPreference: true,
          motionPreference: 'system',
          temperatureUnit: 'C',
        },
        version: storageSchemaVersion,
      })
    );

    expect(repository.get()).toEqual(SETTINGS_DEFAULTS);
    expect(storage.getItem(storageKeys.settings)).toBeNull();
    expect(storage.getItem('unrelated.key')).toBe('preserve me');
  });

  test('removes only the settings key when its payload version is invalid', () => {
    const storage = createMemoryStorage();
    const repository = createSettingsRepository({ storage });

    storage.setItem('unrelated.key', 'preserve me');
    storage.setItem(
      storageKeys.settings,
      JSON.stringify({
        data: {
          motionPreference: 'reduced',
          temperatureUnit: 'F',
        },
        version: storageSchemaVersion + 1,
      })
    );

    expect(repository.get()).toEqual(SETTINGS_DEFAULTS);
    expect(storage.getItem(storageKeys.settings)).toBeNull();
    expect(storage.getItem('unrelated.key')).toBe('preserve me');
  });
});
