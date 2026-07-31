import { describe, expect, test } from 'vitest';
import { removeStorageItems } from '../../frontend/shared/lib/storage/remove-storage-items';
import type { StorageLike } from '../../frontend/shared/lib/storage/storage-types';
import { createMemoryStorage } from './test-storage';

describe('removeStorageItems', () => {
  test('지정한 항목만 제거하고 같은 저장소의 비관련 값은 보존한다', () => {
    const storage = createMemoryStorage();
    storage.setItem('weatherpane.first', 'first');
    storage.setItem('weatherpane.second', 'second');
    storage.setItem('other.product.key', 'keep');

    const failedIds = removeStorageItems([
      { id: 'first', key: 'weatherpane.first', storage },
      { id: 'second', key: 'weatherpane.second', storage },
    ]);

    expect(failedIds).toEqual([]);
    expect(storage.getItem('weatherpane.first')).toBeNull();
    expect(storage.getItem('weatherpane.second')).toBeNull();
    expect(storage.getItem('other.product.key')).toBe('keep');
  });

  test('일부 제거가 실패해도 나머지를 계속 처리하고 실패한 ID를 모두 반환한다', () => {
    const memoryStorage = createMemoryStorage();
    memoryStorage.setItem('weatherpane.first', 'first');
    memoryStorage.setItem('weatherpane.second', 'second');
    memoryStorage.setItem('weatherpane.third', 'third');
    memoryStorage.setItem('other.product.key', 'keep');
    const storage: StorageLike = {
      ...memoryStorage,
      removeItem(key) {
        if (key === 'weatherpane.first' || key === 'weatherpane.third') {
          throw new Error('remove failed');
        }
        memoryStorage.removeItem(key);
      },
    };

    const failedIds = removeStorageItems([
      { id: 'first', key: 'weatherpane.first', storage },
      { id: 'second', key: 'weatherpane.second', storage },
      { id: 'third', key: 'weatherpane.third', storage },
    ]);

    expect(failedIds).toEqual(['first', 'third']);
    expect(memoryStorage.getItem('weatherpane.first')).toBe('first');
    expect(memoryStorage.getItem('weatherpane.second')).toBeNull();
    expect(memoryStorage.getItem('weatherpane.third')).toBe('third');
    expect(memoryStorage.getItem('other.product.key')).toBe('keep');
  });

  test('사용할 수 없는 저장소는 실패로 기록하고 다음 항목을 계속 처리한다', () => {
    const storage = createMemoryStorage();
    storage.setItem('weatherpane.available', 'value');

    const failedIds = removeStorageItems([
      { id: 'unavailable', key: 'weatherpane.unavailable', storage: null },
      { id: 'available', key: 'weatherpane.available', storage },
    ]);

    expect(failedIds).toEqual(['unavailable']);
    expect(storage.getItem('weatherpane.available')).toBeNull();
  });
});
