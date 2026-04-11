import { describe, expect, test } from 'vitest';

import {
  readVersionedValue,
  writeVersionedValue,
} from '../../frontend/shared/lib/storage/versioned-storage';
import { createMemoryStorage } from './test-storage';

describe('versioned storage helpers', () => {
  test('round-trips a valid versioned payload', () => {
    const storage = createMemoryStorage();

    writeVersionedValue({
      data: { enabled: true },
      key: 'weatherpane.test.v1',
      storage,
      version: 1,
    });

    expect(
      readVersionedValue({
        fallback: { enabled: false },
        key: 'weatherpane.test.v1',
        storage,
        version: 1,
      })
    ).toEqual({ enabled: true });
  });

  test('resets invalid json payloads to the fallback value', () => {
    const storage = createMemoryStorage();

    storage.setItem('weatherpane.test.v1', '{not-json');

    expect(
      readVersionedValue({
        fallback: ['fallback'],
        key: 'weatherpane.test.v1',
        storage,
        version: 1,
      })
    ).toEqual(['fallback']);
    expect(storage.getItem('weatherpane.test.v1')).toBeNull();
  });

  test('resets mismatched versions to the fallback value', () => {
    const storage = createMemoryStorage();

    storage.setItem(
      'weatherpane.test.v1',
      JSON.stringify({
        data: { enabled: true },
        version: 2,
      })
    );

    expect(
      readVersionedValue({
        fallback: null,
        key: 'weatherpane.test.v1',
        storage,
        version: 1,
      })
    ).toBeNull();
    expect(storage.getItem('weatherpane.test.v1')).toBeNull();
  });
});
