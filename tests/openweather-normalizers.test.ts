import { describe, expect, test } from 'vitest';

import type { ResolvedLocation } from '../frontend/entities/location/model/types';
import {
  buildWeatherTextMappingInput,
  mapWeatherConditionToVisualBucket,
  normalizeOpenWeatherAqiResponse,
  normalizeOpenWeatherCoreWeatherResponse,
} from '../frontend/shared/api/openweather-normalizers';
import {
  WeatherProviderError,
  normalizeWeatherProviderError,
} from '../frontend/shared/api/weather-provider-error';

const resolvedLocation: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_3f2c1a8b',
  catalogLocationId: 'catalog:seoul-jongno',
  name: '서울 종로구',
  admin1: '서울특별시',
  admin2: '종로구',
  latitude: 37.5729,
  longitude: 126.9794,
  timezone: 'Asia/Seoul',
};

describe('mapWeatherConditionToVisualBucket', () => {
  test('맑음 입력은 clear 버킷으로 매핑한다', () => {
    expect(
      mapWeatherConditionToVisualBucket({
        conditionId: 800,
        description: '맑음',
        icon: '01d',
        cloudCoverPct: 5,
        precipitationMm: 0,
      })
    ).toBe('clear');
  });

  test('흐림 입력은 cloudy 버킷으로 매핑한다', () => {
    expect(
      mapWeatherConditionToVisualBucket({
        conditionId: 803,
        description: '구름 많음',
        icon: '03d',
        cloudCoverPct: 72,
        precipitationMm: 0,
      })
    ).toBe('cloudy');
  });

  test('비 입력은 rainy 버킷으로 매핑한다', () => {
    expect(
      mapWeatherConditionToVisualBucket({
        conditionId: 501,
        description: '비',
        icon: '10d',
        cloudCoverPct: 94,
        precipitationMm: 1.8,
      })
    ).toBe('rainy');
  });

  test('눈 입력은 snowy 버킷으로 매핑한다', () => {
    expect(
      mapWeatherConditionToVisualBucket({
        conditionId: 601,
        description: '눈',
        icon: '13n',
        cloudCoverPct: 91,
        precipitationMm: 2.7,
      })
    ).toBe('snowy');
  });
});

describe('buildWeatherTextMappingInput', () => {
  test('비 입력의 텍스트 매핑 입력값을 계산한다', () => {
    expect(
      buildWeatherTextMappingInput({
        conditionId: 501,
        description: '비',
        icon: '10d',
        cloudCoverPct: 94,
        precipitationMm: 1.8,
      })
    ).toEqual({
      conditionCode: 'RAIN',
      isDay: true,
      precipitationKind: 'rain',
      cloudCoverPct: 94,
      intensity: 'moderate',
    });
  });

  test('눈 입력의 텍스트 매핑 입력값을 계산한다', () => {
    expect(
      buildWeatherTextMappingInput({
        conditionId: 601,
        description: '눈',
        icon: '13n',
        cloudCoverPct: 91,
        precipitationMm: 4.1,
      })
    ).toEqual({
      conditionCode: 'SNOW',
      isDay: false,
      precipitationKind: 'snow',
      cloudCoverPct: 91,
      intensity: 'heavy',
    });
  });
});

describe('payload normalization failures', () => {
  test('잘못된 핵심 날씨 payload를 명시적 타입 오류로 정규화한다', () => {
    expect(() =>
      normalizeOpenWeatherCoreWeatherResponse(
        {
          fetchedAt: '2026-04-11T09:00:00+09:00',
        },
        resolvedLocation
      )
    ).toThrowError(WeatherProviderError);

    try {
      normalizeOpenWeatherCoreWeatherResponse(
        {
          fetchedAt: '2026-04-11T09:00:00+09:00',
        },
        resolvedLocation
      );
    } catch (error) {
      expect(error).toMatchObject({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'mock-openweather',
      });
    }
  });

  test('잘못된 AQI payload를 명시적 타입 오류로 정규화한다', () => {
    expect(() =>
      normalizeOpenWeatherAqiResponse(
        {
          fetchedAt: '2026-04-11T09:00:00+09:00',
          list: [
            {
              dt: 0,
              main: {
                aqi: 2,
              },
              components: {
                co: 'bad',
              },
            },
          ],
        },
        resolvedLocation
      )
    ).toThrowError(WeatherProviderError);
  });
});

describe('normalizeWeatherProviderError', () => {
  test('이미 정규화된 타입 오류는 그대로 유지한다', () => {
    const original = new WeatherProviderError({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
      message: 'not implemented',
    });

    expect(
      normalizeWeatherProviderError(original, {
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'mock-openweather',
        message: 'fallback',
      })
    ).toBe(original);
  });

  test('알 수 없는 오류를 타입 오류로 감싼다', () => {
    const unknownError = new Error('boom');
    const normalized = normalizeWeatherProviderError(unknownError, {
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
      message: 'payload failed',
    });

    expect(normalized).toMatchObject({
      name: 'WeatherProviderError',
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'mock-openweather',
      message: 'payload failed',
      cause: unknownError,
    });
  });
});
