import {
  readVersionedValue,
  resetVersionedValue,
  writeVersionedValue,
} from '../versioned-storage';
import type { StorageLike } from '../storage-types';

type Validator<T> = (value: unknown) => value is T;
type StorageResolver = () => StorageLike | null;

interface VersionedRepositoryOptions<T> {
  storage?: StorageLike;
  key: string;
  version: number;
  validate: Validator<T>;
  getFallback: () => T;
  getDefaultStorage: StorageResolver;
}

interface VersionedRecordRepositoryOptions<T> {
  storage?: StorageLike;
  key: string;
  version: number;
  validateValue: Validator<T>;
  getDefaultStorage: StorageResolver;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveStorage(
  storage: StorageLike | undefined,
  getDefaultStorage: StorageResolver
) {
  return storage ?? getDefaultStorage();
}

function isRecordOf<T>(value: unknown, validateValue: Validator<T>) {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((recordValue) =>
    validateValue(recordValue)
  );
}

export function createVersionedValueRepository<T>({
  storage,
  key,
  version,
  validate,
  getFallback,
  getDefaultStorage,
}: VersionedRepositoryOptions<T>) {
  return {
    clear() {
      const resolvedStorage = resolveStorage(storage, getDefaultStorage);

      if (!resolvedStorage) {
        return;
      }

      resetVersionedValue(resolvedStorage, key);
    },
    get() {
      const resolvedStorage = resolveStorage(storage, getDefaultStorage);

      if (!resolvedStorage) {
        return getFallback();
      }

      return readVersionedValue({
        fallback: getFallback(),
        key,
        storage: resolvedStorage,
        validate,
        version,
      });
    },
    set(value: T) {
      const resolvedStorage = resolveStorage(storage, getDefaultStorage);

      if (!resolvedStorage) {
        return;
      }

      writeVersionedValue({
        data: value,
        key,
        storage: resolvedStorage,
        version,
      });
    },
  };
}

export function createVersionedCollectionRepository<T>({
  storage,
  key,
  version,
  validateItem,
  getDefaultStorage,
}: {
  storage?: StorageLike;
  key: string;
  version: number;
  validateItem: Validator<T>;
  getDefaultStorage: StorageResolver;
}) {
  const valueRepository = createVersionedValueRepository<T[]>({
    getDefaultStorage,
    getFallback: () => [],
    key,
    storage,
    validate: (value): value is T[] =>
      Array.isArray(value) && value.every((item) => validateItem(item)),
    version,
  });

  return {
    clear: valueRepository.clear,
    getAll() {
      return valueRepository.get();
    },
    replaceAll(value: T[]) {
      valueRepository.set(value);
    },
  };
}

export function createVersionedRecordRepository<T>({
  storage,
  key,
  version,
  validateValue,
  getDefaultStorage,
}: VersionedRecordRepositoryOptions<T>) {
  const valueRepository = createVersionedValueRepository<Record<string, T>>({
    getDefaultStorage,
    getFallback: () => ({}),
    key,
    storage,
    validate: (value): value is Record<string, T> =>
      isRecordOf(value, validateValue),
    version,
  });

  return {
    clear: valueRepository.clear,
    get(recordKey: string) {
      return valueRepository.get()[recordKey] ?? null;
    },
    remove(recordKey: string) {
      const nextValue = { ...valueRepository.get() };

      delete nextValue[recordKey];
      valueRepository.set(nextValue);
    },
    set(recordKey: string, value: T) {
      valueRepository.set({
        ...valueRepository.get(),
        [recordKey]: value,
      });
    },
  };
}
