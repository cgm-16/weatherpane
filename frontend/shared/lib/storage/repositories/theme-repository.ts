import { getLocalStorage } from '../browser-storage';
import { storageKeys, storageSchemaVersion } from '../storage-keys';
import type { StorageLike } from '../storage-types';
import { createVersionedValueRepository } from './repository-utils';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeRepositoryOptions {
  storage?: StorageLike;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function createThemeRepository({
  storage,
}: ThemeRepositoryOptions = {}) {
  return createVersionedValueRepository<ThemePreference | null>({
    getDefaultStorage: getLocalStorage,
    getFallback: () => null,
    key: storageKeys.theme,
    storage,
    validate: (value): value is ThemePreference | null =>
      value === null || isThemePreference(value),
    version: storageSchemaVersion,
  });
}
