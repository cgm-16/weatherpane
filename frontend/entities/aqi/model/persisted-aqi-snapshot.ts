export interface PersistedAqiSnapshot {
  locationId: string;
  fetchedAt: string;
  observedAt: string;
  aqi: number;
  category: string;
  source: {
    provider: string;
    modelVersion?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isPersistedAqiSnapshot(
  value: unknown
): value is PersistedAqiSnapshot {
  if (!isRecord(value) || !isRecord(value.source)) {
    return false;
  }

  return (
    isString(value.locationId) &&
    isString(value.fetchedAt) &&
    isString(value.observedAt) &&
    isNumber(value.aqi) &&
    isString(value.category) &&
    isString(value.source.provider) &&
    (typeof value.source.modelVersion === 'undefined' ||
      isString(value.source.modelVersion))
  );
}
