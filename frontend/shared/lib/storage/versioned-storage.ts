import type { StorageLike, VersionedPayload } from './storage-types';

type Validator<T> = (value: unknown) => value is T;

interface ReadVersionedValueOptions<T> {
  storage: StorageLike;
  key: string;
  version: number;
  fallback: T;
  validate?: Validator<T>;
}

interface WriteVersionedValueOptions<T> {
  storage: StorageLike;
  key: string;
  version: number;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVersionedPayload(
  value: unknown
): value is VersionedPayload<unknown> {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    Number.isFinite(value.version) &&
    'data' in value
  );
}

export function resetVersionedValue(storage: StorageLike, key: string) {
  storage.removeItem(key);
}

export function readVersionedValue<T>({
  storage,
  key,
  version,
  fallback,
  validate,
}: ReadVersionedValueOptions<T>): T {
  const rawValue = storage.getItem(key);

  if (rawValue === null) {
    return fallback;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (
      !isVersionedPayload(parsedValue) ||
      parsedValue.version !== version ||
      (validate && !validate(parsedValue.data))
    ) {
      resetVersionedValue(storage, key);
      return fallback;
    }

    return parsedValue.data as T;
  } catch {
    resetVersionedValue(storage, key);
    return fallback;
  }
}

export function writeVersionedValue<T>({
  storage,
  key,
  version,
  data,
}: WriteVersionedValueOptions<T>) {
  storage.setItem(
    key,
    JSON.stringify({
      data,
      version,
    } satisfies VersionedPayload<T>)
  );
}
