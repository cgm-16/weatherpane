import { describe, expect, test } from 'vitest';

import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import { createThemeRepository } from '../../frontend/shared/lib/storage/repositories/theme-repository';
import { createMemoryStorage } from './test-storage';

describe('theme repository', () => {
  test('defaults to null when no theme is stored', () => {
    const repository = createThemeRepository({
      storage: createMemoryStorage(),
    });

    expect(repository.get()).toBeNull();
  });

  test('round-trips a stored theme selection', () => {
    const repository = createThemeRepository({
      storage: createMemoryStorage(),
    });

    repository.set('dark');

    expect(repository.get()).toBe('dark');
  });

  test('resets invalid theme payloads', () => {
    const storage = createMemoryStorage();
    const repository = createThemeRepository({ storage });

    storage.setItem(
      storageKeys.theme,
      JSON.stringify({
        data: { theme: 'midnight' },
        version: 1,
      })
    );

    expect(repository.get()).toBeNull();
    expect(storage.getItem(storageKeys.theme)).toBeNull();
  });
});
