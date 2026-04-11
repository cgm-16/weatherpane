import type { Aqi, AqiCategory } from '../model/aqi';
import type { ResolvedLocation } from '~/entities/location';
import {
  WeatherProviderError,
  normalizeWeatherProviderError,
} from '../../../shared/api/weather-provider-error';

export interface OpenWeatherAqiResponse {
  fetchedAt: string;
  list: Array<{
    dt: number;
    main: {
      aqi: number;
    };
    components: {
      co: number;
      no2: number;
      o3: number;
      pm2_5: number;
      pm10: number;
      so2: number;
      nh3?: number;
    };
  }>;
}

const openWeatherProviderName = 'mock-openweather';

export const mockOpenWeatherAqiFixture: OpenWeatherAqiResponse = {
  fetchedAt: '2026-04-11T09:00:00+09:00',
  list: [
    {
      dt: Date.parse('2026-04-11T08:45:00+09:00') / 1000,
      main: {
        aqi: 2,
      },
      components: {
        co: 210.4,
        no2: 14.1,
        o3: 52.8,
        pm2_5: 18.4,
        pm10: 27.3,
        so2: 3.2,
        nh3: 1.4,
      },
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function toIsoDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function isOpenWeatherAqiResponse(
  value: unknown
): value is OpenWeatherAqiResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.list) ||
    value.list.length === 0
  ) {
    return false;
  }

  const first = value.list[0];

  return (
    isString(value.fetchedAt) &&
    isRecord(first) &&
    isNumber(first.dt) &&
    isRecord(first.main) &&
    isNumber(first.main.aqi) &&
    isRecord(first.components) &&
    isNonNegativeNumber(first.components.co) &&
    isNonNegativeNumber(first.components.no2) &&
    isNonNegativeNumber(first.components.o3) &&
    isNonNegativeNumber(first.components.pm2_5) &&
    isNonNegativeNumber(first.components.pm10) &&
    isNonNegativeNumber(first.components.so2) &&
    (typeof first.components.nh3 === 'undefined' ||
      isNonNegativeNumber(first.components.nh3))
  );
}

function getAqiCategory(aqi: number): AqiCategory {
  switch (aqi) {
    case 1:
      return 'good';
    case 2:
      return 'fair';
    case 3:
      return 'moderate';
    case 4:
      return 'poor';
    case 5:
      return 'very-poor';
    default:
      throw new WeatherProviderError({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: openWeatherProviderName,
        message: `Unsupported AQI value: ${aqi}`,
      });
  }
}

export function normalizeOpenWeatherAqiResponse(
  payload: unknown,
  location: ResolvedLocation
): Aqi {
  if (!isOpenWeatherAqiResponse(payload)) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: openWeatherProviderName,
      message: 'AQI payload is invalid.',
    });
  }

  try {
    const current = payload.list[0];

    return {
      locationId: location.locationId,
      fetchedAt: payload.fetchedAt,
      observedAt: toIsoDateTime(current.dt),
      summary: {
        aqi: current.main.aqi,
        category: getAqiCategory(current.main.aqi),
      },
      pollutants: {
        co: current.components.co,
        no2: current.components.no2,
        o3: current.components.o3,
        pm10: current.components.pm10,
        pm25: current.components.pm2_5,
        so2: current.components.so2,
        nh3: current.components.nh3,
      },
      source: {
        provider: openWeatherProviderName,
        modelVersion: 'mock-2026-04-11',
      },
    };
  } catch (error) {
    throw normalizeWeatherProviderError(error, {
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: openWeatherProviderName,
      message: 'AQI payload normalization failed.',
    });
  }
}
