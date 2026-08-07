export interface PersistedDailySnapshotEntry {
  date: string;
  minC: number;
  maxC: number;
  conditionCode: string;
  conditionText: string;
}

export interface PersistedWeatherSnapshot {
  locationId: string;
  fetchedAt: string;
  observedAt: string;
  temperatureC: number;
  conditionCode: string;
  conditionText: string;
  todayMinC: number;
  todayMaxC: number;
  daily?: PersistedDailySnapshotEntry[];
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

function isPersistedDailySnapshotEntry(
  value: unknown
): value is PersistedDailySnapshotEntry {
  return (
    isRecord(value) &&
    isString(value.date) &&
    isNumber(value.minC) &&
    isNumber(value.maxC) &&
    isString(value.conditionCode) &&
    isString(value.conditionText)
  );
}

export function isPersistedWeatherSnapshot(
  value: unknown
): value is PersistedWeatherSnapshot {
  if (!isRecord(value) || !isRecord(value.source)) {
    return false;
  }

  return (
    isString(value.locationId) &&
    isString(value.fetchedAt) &&
    isString(value.observedAt) &&
    isNumber(value.temperatureC) &&
    isString(value.conditionCode) &&
    isString(value.conditionText) &&
    isNumber(value.todayMinC) &&
    isNumber(value.todayMaxC) &&
    (typeof value.daily === 'undefined' ||
      (Array.isArray(value.daily) &&
        value.daily.every(isPersistedDailySnapshotEntry))) &&
    isString(value.source.provider) &&
    (typeof value.source.modelVersion === 'undefined' ||
      isString(value.source.modelVersion))
  );
}
