import type { ResolvedLocation } from '~/entities/location';
import type {
  CoreWeather,
  WeatherCondition,
  WeatherConditionIntensity,
  WeatherPrecipitationKind,
  WeatherTextMappingInput,
  WeatherVisualBucket,
} from '../model/core-weather';
import {
  WeatherProviderError,
  normalizeWeatherProviderError,
} from '../../../shared/api/weather-provider-error';

export interface OpenWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherCoreWeatherResponse {
  fetchedAt: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
    weather: OpenWeatherCondition[];
  };
  daily: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
  }>;
  hourly: Array<{
    dt: number;
    temp: number;
    pop: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
    weather: OpenWeatherCondition[];
  }>;
}

interface OpenWeatherConditionContext {
  conditionId: number;
  icon: string;
  cloudCoverPct: number;
  precipitationMm: number;
}

const openWeatherProviderName = 'mock-openweather';
const observedAt = Date.parse('2026-04-11T08:50:00+09:00') / 1000;
const hourlyStart = Date.parse('2026-04-11T09:00:00+09:00') / 1000;

export const mockOpenWeatherCoreWeatherFixture: OpenWeatherCoreWeatherResponse =
  {
    fetchedAt: '2026-04-11T09:00:00+09:00',
    current: {
      dt: observedAt,
      temp: 17.2,
      feels_like: 16.4,
      humidity: 56,
      wind_speed: 2.8,
      dew_point: 8.1,
      uvi: 5.3,
      clouds: 8,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: '맑음',
          icon: '01d',
        },
      ],
    },
    daily: [
      {
        dt: hourlyStart,
        temp: {
          min: 12.1,
          max: 21.4,
        },
      },
    ],
    hourly: Array.from({ length: 12 }, (_, index) => ({
      dt: hourlyStart + index * 60 * 60,
      temp: 17.2 + index * 0.4,
      pop: index < 4 ? 0 : 0.15,
      clouds: index < 4 ? 8 : 42,
      weather: [
        {
          id: index < 6 ? 800 : 803,
          main: index < 6 ? 'Clear' : 'Clouds',
          description: index < 6 ? '맑음' : '구름 많음',
          icon: index < 3 ? '01d' : index < 6 ? '01n' : '03n',
        },
      ],
    })),
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return isNumber(value) && value >= min && value <= max;
}

function isPercent(value: unknown): value is number {
  return isNumberInRange(value, 0, 100);
}

function isUnitInterval(value: unknown): value is number {
  return isNumberInRange(value, 0, 1);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalPrecipitationAmount(
  value: unknown
): value is { '1h'?: number } | undefined {
  if (typeof value === 'undefined') {
    return true;
  }

  return (
    isRecord(value) &&
    (typeof value['1h'] === 'undefined' ||
      (isNumber(value['1h']) && value['1h'] >= 0))
  );
}

function toIsoDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function getPrecipitationKind(conditionId: number): WeatherPrecipitationKind {
  if (conditionId >= 600 && conditionId < 700) {
    return 'snow';
  }

  if (conditionId >= 200 && conditionId < 600) {
    return 'rain';
  }

  return 'none';
}

function getConditionCode(conditionId: number): string {
  if (conditionId >= 600 && conditionId < 700) {
    return 'SNOW';
  }

  if (conditionId >= 200 && conditionId < 600) {
    return 'RAIN';
  }

  if (conditionId === 800) {
    return 'CLEAR';
  }

  return 'CLOUDY';
}

function getConditionIntensity(
  precipitationKind: WeatherPrecipitationKind,
  precipitationMm: number
): WeatherConditionIntensity {
  if (precipitationKind === 'none' || precipitationMm <= 0) {
    return 'none';
  }

  if (precipitationMm < 1) {
    return 'light';
  }

  if (precipitationMm < 3) {
    return 'moderate';
  }

  return 'heavy';
}

function getPrecipitationAmount(
  value:
    | OpenWeatherCoreWeatherResponse['current']
    | OpenWeatherCoreWeatherResponse['hourly'][number]
): number {
  return value.rain?.['1h'] ?? value.snow?.['1h'] ?? 0;
}

function isOpenWeatherCondition(value: unknown): value is OpenWeatherCondition {
  return (
    isRecord(value) &&
    isNumber(value.id) &&
    isString(value.main) &&
    isString(value.description) &&
    isString(value.icon)
  );
}

function isOpenWeatherHourlyEntry(
  value: unknown
): value is OpenWeatherCoreWeatherResponse['hourly'][number] {
  return (
    isRecord(value) &&
    isNumber(value.dt) &&
    isNumber(value.temp) &&
    isUnitInterval(value.pop) &&
    isPercent(value.clouds) &&
    isOptionalPrecipitationAmount(value.rain) &&
    isOptionalPrecipitationAmount(value.snow) &&
    Array.isArray(value.weather) &&
    value.weather.length > 0 &&
    isOpenWeatherCondition(value.weather[0])
  );
}

function isOpenWeatherCoreWeatherResponse(
  value: unknown
): value is OpenWeatherCoreWeatherResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.hourly) ||
    value.hourly.length < 12 ||
    !value.hourly.slice(0, 12).every(isOpenWeatherHourlyEntry) ||
    !Array.isArray(value.daily)
  ) {
    return false;
  }

  const current = value.current;

  if (
    !isRecord(current) ||
    !isNumber(current.dt) ||
    !isNumber(current.temp) ||
    !isNumber(current.feels_like) ||
    !isPercent(current.humidity) ||
    !isNumber(current.wind_speed) ||
    !isNumber(current.dew_point) ||
    !isNumber(current.uvi) ||
    !isPercent(current.clouds) ||
    !isOptionalPrecipitationAmount(current.rain) ||
    !isOptionalPrecipitationAmount(current.snow) ||
    !Array.isArray(current.weather) ||
    current.weather.length === 0 ||
    !isOpenWeatherCondition(current.weather[0])
  ) {
    return false;
  }

  const firstDaily = value.daily[0];

  return (
    isString(value.fetchedAt) &&
    isRecord(firstDaily) &&
    isRecord(firstDaily.temp) &&
    isNumber(firstDaily.temp.min) &&
    isNumber(firstDaily.temp.max)
  );
}

function getConditionText(conditionCode: string): string {
  switch (conditionCode) {
    case 'CLEAR':
      return '맑음';
    case 'CLOUDY':
      return '흐림';
    case 'RAIN':
      return '비';
    case 'SNOW':
      return '눈';
    default:
      return conditionCode;
  }
}

export function mapWeatherConditionToVisualBucket(
  input: OpenWeatherConditionContext
): WeatherVisualBucket {
  const precipitationKind = getPrecipitationKind(input.conditionId);

  if (precipitationKind === 'snow') {
    return 'snowy';
  }

  if (precipitationKind === 'rain') {
    return 'rainy';
  }

  if (input.conditionId === 800 && input.cloudCoverPct <= 20) {
    return 'clear';
  }

  return 'cloudy';
}

export function buildWeatherTextMappingInput(
  input: OpenWeatherConditionContext
): WeatherTextMappingInput {
  const precipitationKind = getPrecipitationKind(input.conditionId);
  const conditionCode = getConditionCode(input.conditionId);

  return {
    conditionCode,
    isDay: input.icon.endsWith('d'),
    precipitationKind,
    cloudCoverPct: input.cloudCoverPct,
    intensity: getConditionIntensity(precipitationKind, input.precipitationMm),
  };
}

function createWeatherCondition(
  condition: OpenWeatherCondition,
  cloudCoverPct: number,
  precipitationMm: number
): WeatherCondition {
  const input = {
    conditionId: condition.id,
    icon: condition.icon,
    cloudCoverPct,
    precipitationMm,
  };
  const textMapping = buildWeatherTextMappingInput(input);

  return {
    code: textMapping.conditionCode,
    text: getConditionText(textMapping.conditionCode),
    isDay: textMapping.isDay,
    visualBucket: mapWeatherConditionToVisualBucket(input),
    textMapping,
  };
}

export function normalizeOpenWeatherCoreWeatherResponse(
  payload: unknown,
  location: ResolvedLocation
): CoreWeather {
  if (!isOpenWeatherCoreWeatherResponse(payload)) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: openWeatherProviderName,
      message: 'Core weather payload is invalid.',
    });
  }

  try {
    const currentCondition = payload.current.weather[0];
    const currentPrecipitationMm = getPrecipitationAmount(payload.current);

    return {
      locationId: location.locationId,
      fetchedAt: payload.fetchedAt,
      observedAt: toIsoDateTime(payload.current.dt),
      current: {
        temperatureC: payload.current.temp,
        feelsLikeC: payload.current.feels_like,
        humidityPct: payload.current.humidity,
        windMps: payload.current.wind_speed,
        precipitationMm: currentPrecipitationMm,
        uvIndex: payload.current.uvi,
        dewPointC: payload.current.dew_point,
        condition: createWeatherCondition(
          currentCondition,
          payload.current.clouds,
          currentPrecipitationMm
        ),
      },
      today: {
        minC: payload.daily[0].temp.min,
        maxC: payload.daily[0].temp.max,
      },
      hourly: payload.hourly.slice(0, 12).map((entry) => ({
        at: toIsoDateTime(entry.dt),
        temperatureC: entry.temp,
        popPct: Math.round(entry.pop * 100),
        condition: createWeatherCondition(
          entry.weather[0],
          entry.clouds,
          getPrecipitationAmount(entry)
        ),
      })),
      source: {
        provider: openWeatherProviderName,
        modelVersion: 'mock-2026-04-11',
      },
    };
  } catch (error) {
    throw normalizeWeatherProviderError(error, {
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: openWeatherProviderName,
      message: 'Core weather payload normalization failed.',
    });
  }
}
