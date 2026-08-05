import { describe, expect, test } from 'vitest';
import { resetLocalData } from '../../frontend/features/settings/model/reset-local-data';
import { storageKeys } from '../../frontend/shared/lib/storage/storage-keys';
import type { StorageLike } from '../../frontend/shared/lib/storage/storage-types';
import { createMemoryStorage } from '../storage/test-storage';

const localTargetKeys = [
  storageKeys.activeLocation,
  storageKeys.aqiSnapshots,
  storageKeys.favorites,
  storageKeys.recents,
  storageKeys.settings,
  storageKeys.theme,
  storageKeys.weatherSnapshots,
] as const;

const sessionTargetKeys = [
  storageKeys.theme,
  storageKeys.unsupportedRouteContext,
] as const;

function seedStorage(
  storage: StorageLike,
  keys: readonly string[],
  unrelatedKey: string
) {
  for (const key of keys) {
    storage.setItem(key, `saved:${key}`);
  }
  storage.setItem(unrelatedKey, 'keep');
}

describe('resetLocalData', () => {
  test('Weatherpane의 정확한 local/session 대상만 제거하고 비관련 값은 보존한다', () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    seedStorage(localStorage, localTargetKeys, 'other.local.key');
    seedStorage(sessionStorage, sessionTargetKeys, 'other.session.key');

    const result = resetLocalData({ localStorage, sessionStorage });

    expect(result).toEqual({ ok: true });
    for (const key of localTargetKeys) {
      expect(localStorage.getItem(key), key).toBeNull();
    }
    for (const key of sessionTargetKeys) {
      expect(sessionStorage.getItem(key), key).toBeNull();
    }
    expect(localStorage.getItem('other.local.key')).toBe('keep');
    expect(sessionStorage.getItem('other.session.key')).toBe('keep');
  });

  test('local/session 제거 실패를 모두 보고하고 가능한 나머지 대상은 제거한다', () => {
    const localMemory = createMemoryStorage();
    const sessionMemory = createMemoryStorage();
    seedStorage(localMemory, localTargetKeys, 'other.local.key');
    seedStorage(sessionMemory, sessionTargetKeys, 'other.session.key');
    const localStorage: StorageLike = {
      ...localMemory,
      removeItem(key) {
        if (key === storageKeys.theme) {
          throw new Error('local theme removal failed');
        }
        localMemory.removeItem(key);
      },
    };
    const sessionStorage: StorageLike = {
      ...sessionMemory,
      removeItem(key) {
        if (key === storageKeys.unsupportedRouteContext) {
          throw new Error('session context removal failed');
        }
        sessionMemory.removeItem(key);
      },
    };

    const result = resetLocalData({ localStorage, sessionStorage });

    expect(result).toEqual({
      failedTargets: [
        'localStorage.theme',
        'sessionStorage.unsupportedRouteContext',
      ],
      ok: false,
    });
    expect(localMemory.getItem(storageKeys.theme)).toBe(
      `saved:${storageKeys.theme}`
    );
    expect(localMemory.getItem(storageKeys.weatherSnapshots)).toBeNull();
    expect(sessionMemory.getItem(storageKeys.theme)).toBeNull();
    expect(sessionMemory.getItem(storageKeys.unsupportedRouteContext)).toBe(
      `saved:${storageKeys.unsupportedRouteContext}`
    );
    expect(localMemory.getItem('other.local.key')).toBe('keep');
    expect(sessionMemory.getItem('other.session.key')).toBe('keep');
  });

  test('저장소를 사용할 수 없으면 해당 저장소의 모든 대상을 실패로 반환한다', () => {
    const sessionStorage = createMemoryStorage();
    seedStorage(sessionStorage, sessionTargetKeys, 'other.session.key');

    const result = resetLocalData({
      localStorage: null,
      sessionStorage,
    });

    expect(result).toEqual({
      failedTargets: [
        'localStorage.activeLocation',
        'localStorage.aqiSnapshots',
        'localStorage.favorites',
        'localStorage.recents',
        'localStorage.settings',
        'localStorage.theme',
        'localStorage.weatherSnapshots',
      ],
      ok: false,
    });
    for (const key of sessionTargetKeys) {
      expect(sessionStorage.getItem(key), key).toBeNull();
    }
    expect(sessionStorage.getItem('other.session.key')).toBe('keep');
  });
});
