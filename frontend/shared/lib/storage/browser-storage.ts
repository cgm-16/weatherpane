import type { StorageLike } from './storage-types';

function getBrowserStorage(
  storageKind: 'localStorage' | 'sessionStorage'
): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[storageKind];
  } catch {
    return null;
  }
}

export function getLocalStorage() {
  return getBrowserStorage('localStorage');
}

export function getSessionStorage() {
  return getBrowserStorage('sessionStorage');
}
