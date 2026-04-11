import { describe, expect, test } from 'vitest';

import type { UnsupportedRouteContext } from '../../frontend/entities/location/model/types';
import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import { createUnsupportedRouteContextRepository } from '../../frontend/shared/lib/storage/repositories/unsupported-route-context-repository';
import { createMemoryStorage } from './test-storage';

const unsupportedRouteContext: UnsupportedRouteContext = {
  catalogLocation: {
    admin1: '강원특별자치도',
    admin2: '속초시',
    catalogLocationId: 'catalog:sokcho',
    latitude: 38.207,
    longitude: 128.5918,
    name: '속초시',
  },
  createdAt: '2026-04-11T11:20:00+09:00',
  token: 'unsupported::catalog:sokcho',
};

describe('unsupported route context repository', () => {
  test('stores context by token in session storage', () => {
    const repository = createUnsupportedRouteContextRepository({
      storage: createMemoryStorage(),
    });

    repository.set(unsupportedRouteContext);

    expect(repository.get(unsupportedRouteContext.token)).toEqual(
      unsupportedRouteContext
    );
  });

  test('removes a stored token context', () => {
    const repository = createUnsupportedRouteContextRepository({
      storage: createMemoryStorage(),
    });

    repository.set(unsupportedRouteContext);
    repository.remove(unsupportedRouteContext.token);

    expect(repository.get(unsupportedRouteContext.token)).toBeNull();
  });

  test('resets invalid session payloads', () => {
    const storage = createMemoryStorage();
    const repository = createUnsupportedRouteContextRepository({ storage });

    storage.setItem(
      storageKeys.unsupportedRouteContext,
      JSON.stringify({
        data: { not: 'valid' },
        version: 1,
      })
    );

    expect(repository.get(unsupportedRouteContext.token)).toBeNull();
    expect(storage.getItem(storageKeys.unsupportedRouteContext)).toBeNull();
  });
});
