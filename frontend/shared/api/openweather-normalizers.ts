import type { Aqi, AqiCategory } from '~/entities/aqi/model/aqi';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type {
  CoreWeather,
  WeatherCondition,
  WeatherConditionIntensity,
  WeatherPrecipitationKind,
  WeatherTextMappingInput,
  WeatherVisualBucket,
} from '~/entities/weather/model/core-weather';

import type {
  MockOpenWeatherAqiResponse,
  MockOpenWeatherCondition,
  MockOpenWeatherCoreWeatherResponse,
} from './mock-weather-fixtures';
import {
  WeatherProviderError,
  normalizeWeatherProviderError,
} from './weather-provider-error';

interface OpenWeatherConditionContext {
  conditionId: number;
  description: string;
  icon: string;
  cloudCoverPct: number;
  precipitationMm: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
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
  condition: MockOpenWeatherCondition,
  cloudCoverPct: number,
  precipitationMm: number
): WeatherCondition {
  const input = {
    conditionId: condition.id,
    description: condition.description,
    icon: condition.icon,
    cloudCoverPct,
    precipitationMm,
  };
  const textMapping = buildWeatherTextMappingInput(input);

  return {
    code: textMapping.conditionCode,
    text: condition.description,
    isDay: textMapping.isDay,
    visualBucket: mapWeatherConditionToVisualBucket(input),
    textMapping,
  };
}

function getCurrentPrecipitationMm(
  current: MockOpenWeatherCoreWeatherResponse['current']
): number {
  return current.rain?.['1h'] ?? current.snow?.['1h'] ?? 0;
}

function getHourlyPrecipitationMm(
  hourly: MockOpenWeatherCoreWeatherResponse['hourly'][number]
): number {
  return hourly.rain?.['1h'] ?? hourly.snow?.['1h'] ?? 0;
}

function isMockOpenWeatherCondition(
  value: unknown
): value is MockOpenWeatherCondition {
  return (
    isRecord(value) &&
    isNumber(value.id) &&
    isString(value.main) &&
    isString(value.description) &&
    isString(value.icon)
  );
}

function isMockOpenWeatherCoreWeatherResponse(
  value: unknown
): value is MockOpenWeatherCoreWeatherResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.hourly) ||
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
    !isNumber(current.humidity) ||
    !isNumber(current.wind_speed) ||
    !isNumber(current.dew_point) ||
    !isNumber(current.uvi) ||
    !isNumber(current.clouds) ||
    !Array.isArray(current.weather) ||
    current.weather.length === 0 ||
    !isMockOpenWeatherCondition(current.weather[0])
  ) {
    return false;
  }

  const firstDaily = value.daily[0];
  const firstHourly = value.hourly[0];

  return (
    isString(value.fetchedAt) &&
    isRecord(firstDaily) &&
    isRecord(firstDaily.temp) &&
    isNumber(firstDaily.temp.min) &&
    isNumber(firstDaily.temp.max) &&
    isRecord(firstHourly) &&
    isNumber(firstHourly.dt) &&
    isNumber(firstHourly.temp) &&
    isNumber(firstHourly.pop) &&
    isNumber(firstHourly.clouds) &&
    Array.isArray(firstHourly.weather) &&
    firstHourly.weather.length > 0 &&
    isMockOpenWeatherCondition(firstHourly.weather[0])
  );
}

function isMockOpenWeatherAqiResponse(
  value: unknown
): value is MockOpenWeatherAqiResponse {
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
    isNumber(first.components.co) &&
    isNumber(first.components.no2) &&
    isNumber(first.components.o3) &&
    isNumber(first.components.pm2_5) &&
    isNumber(first.components.pm10) &&
    isNumber(first.components.so2) &&
    (typeof first.components.nh3 === 'undefined' ||
      isNumber(first.components.nh3))
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
        provider: 'mock-openweather',
        message: `Unsupported AQI value: ${aqi}`,
      });
  }
}

export function normalizeOpenWeatherCoreWeatherResponse(
  payload: unknown,
  location: ResolvedLocation
): CoreWeather {
  if (!isMockOpenWeatherCoreWeatherResponse(payload)) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
      message: 'Core weather payload is invalid.',
    });
  }

  try {
    const currentCondition = payload.current.weather[0];

    return {
      locationId: location.locationId,
      fetchedAt: payload.fetchedAt,
      observedAt: toIsoDateTime(payload.current.dt),
      current: {
        temperatureC: payload.current.temp,
        feelsLikeC: payload.current.feels_like,
        humidityPct: payload.current.humidity,
        windMps: payload.current.wind_speed,
        precipitationMm: getCurrentPrecipitationMm(payload.current),
        uvIndex: payload.current.uvi,
        dewPointC: payload.current.dew_point,
        condition: createWeatherCondition(
          currentCondition,
          payload.current.clouds,
          getCurrentPrecipitationMm(payload.current)
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
          getHourlyPrecipitationMm(entry)
        ),
      })),
      source: {
        provider: 'mock-openweather',
        modelVersion: 'mock-2026-04-11',
      },
    };
  } catch (error) {
    throw normalizeWeatherProviderError(error, {
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
      message: 'Core weather payload normalization failed.',
    });
  }
}

export function normalizeOpenWeatherAqiResponse(
  payload: unknown,
  location: ResolvedLocation
): Aqi {
  if (!isMockOpenWeatherAqiResponse(payload)) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
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
        provider: 'mock-openweather',
        modelVersion: 'mock-2026-04-11',
      },
    };
  } catch (error) {
    throw normalizeWeatherProviderError(error, {
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
      message: 'AQI payload normalization failed.',
    });
  }
}
