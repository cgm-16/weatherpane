import type { StorageLike } from './storage-types';

interface StorageItem {
  id: string;
  key: string;
  storage: StorageLike | null;
}

export function removeStorageItems(items: readonly StorageItem[]): string[] {
  const failedIds: string[] = [];

  for (const item of items) {
    if (item.storage === null) {
      failedIds.push(item.id);
      continue;
    }

    try {
      item.storage.removeItem(item.key);
    } catch {
      failedIds.push(item.id);
    }
  }

  return failedIds;
}
