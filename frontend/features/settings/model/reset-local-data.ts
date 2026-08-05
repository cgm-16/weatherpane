import {
  getLocalStorage,
  getSessionStorage,
} from '~/shared/lib/storage/browser-storage';
import { removeStorageItems } from '~/shared/lib/storage/remove-storage-items';
import { storageKeys } from '~/shared/lib/storage/storage-keys';
import type { StorageLike } from '~/shared/lib/storage/storage-types';

interface ResetLocalDataOptions {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
}

export type ResetLocalDataResult =
  | { ok: true }
  | { ok: false; failedTargets: string[] };

export function resetLocalData({
  localStorage = getLocalStorage(),
  sessionStorage = getSessionStorage(),
}: ResetLocalDataOptions = {}): ResetLocalDataResult {
  const failedTargets = removeStorageItems([
    {
      id: 'localStorage.activeLocation',
      key: storageKeys.activeLocation,
      storage: localStorage,
    },
    {
      id: 'localStorage.aqiSnapshots',
      key: storageKeys.aqiSnapshots,
      storage: localStorage,
    },
    {
      id: 'localStorage.favorites',
      key: storageKeys.favorites,
      storage: localStorage,
    },
    {
      id: 'localStorage.recents',
      key: storageKeys.recents,
      storage: localStorage,
    },
    {
      id: 'localStorage.settings',
      key: storageKeys.settings,
      storage: localStorage,
    },
    {
      id: 'localStorage.theme',
      key: storageKeys.theme,
      storage: localStorage,
    },
    {
      id: 'localStorage.weatherSnapshots',
      key: storageKeys.weatherSnapshots,
      storage: localStorage,
    },
    {
      id: 'sessionStorage.theme',
      key: storageKeys.theme,
      storage: sessionStorage,
    },
    {
      id: 'sessionStorage.unsupportedRouteContext',
      key: storageKeys.unsupportedRouteContext,
      storage: sessionStorage,
    },
  ]);

  return failedTargets.length === 0
    ? { ok: true }
    : { failedTargets, ok: false };
}
