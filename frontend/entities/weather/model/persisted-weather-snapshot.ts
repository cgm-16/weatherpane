export interface PersistedWeatherSnapshot {
  locationId: string;
  fetchedAt: string;
  observedAt: string;
  temperatureC: number;
  conditionCode: string;
  conditionText: string;
  todayMinC: number;
  todayMaxC: number;
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
    isString(value.source.provider) &&
    (typeof value.source.modelVersion === 'undefined' ||
      isString(value.source.modelVersion))
  );
}
