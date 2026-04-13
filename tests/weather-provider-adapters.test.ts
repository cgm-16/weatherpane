import { describe, expect, test, vi, afterEach } from 'vitest';

import type { ResolvedLocation } from '../frontend/entities/location/model/types';
import { mockWeatherProvider } from '../frontend/shared/api/mock-weather-provider';
import { realWeatherProvider } from '../frontend/shared/api/real-weather-provider';

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

describe('mockWeatherProvider', () => {
  test('정규화된 핵심 날씨 데이터를 반환한다', async () => {
    const weather = await mockWeatherProvider.getCoreWeather(resolvedLocation);

    expect(weather.locationId).toBe(resolvedLocation.locationId);
    expect(weather.current).toMatchObject({
      temperatureC: 17.2,
      feelsLikeC: 16.4,
      humidityPct: 56,
      dewPointC: 8.1,
      uvIndex: 5.3,
    });
    expect(weather.current.condition).toMatchObject({
      code: 'CLEAR',
      text: '맑음',
      isDay: true,
      visualBucket: 'clear',
      textMapping: {
        conditionCode: 'CLEAR',
        isDay: true,
        precipitationKind: 'none',
        cloudCoverPct: 8,
        intensity: 'none',
      },
    });
    expect(weather.today).toEqual({
      minC: 12.1,
      maxC: 21.4,
    });
    expect(weather.hourly).toHaveLength(12);
    expect(weather.hourly[0]).toMatchObject({
      temperatureC: 17.2,
      popPct: 0,
    });
    expect(weather.source).toEqual({
      provider: 'mock-openweather',
      modelVersion: 'mock-2026-04-11',
    });
  });

  test('정규화된 AQI 데이터를 반환한다', async () => {
    const aqi = await mockWeatherProvider.getAqi(resolvedLocation);

    expect(aqi.locationId).toBe(resolvedLocation.locationId);
    expect(aqi.summary).toEqual({
      aqi: 2,
      category: 'fair',
    });
    expect(aqi.pollutants).toMatchObject({
      co: 210.4,
      no2: 14.1,
      o3: 52.8,
      pm10: 27.3,
      pm25: 18.4,
      so2: 3.2,
    });
    expect(aqi.source).toEqual({
      provider: 'mock-openweather',
      modelVersion: 'mock-2026-04-11',
    });
  });
});

describe('realWeatherProvider', () => {
  test('핵심 날씨 조회는 명시적 타입 오류로 실패한다', async () => {
    await expect(
      realWeatherProvider.getCoreWeather(resolvedLocation)
    ).rejects.toMatchObject({
      name: 'WeatherProviderError',
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
    });
  });

  test('AQI 조회는 명시적 타입 오류로 실패한다', async () => {
    await expect(
      realWeatherProvider.getAqi(resolvedLocation)
    ).rejects.toMatchObject({
      name: 'WeatherProviderError',
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
    });
  });

  describe('geocode', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    test('API 키가 없으면 PROVIDER_NOT_IMPLEMENTED 오류를 발생시킨다', async () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', '');

      await expect(
        realWeatherProvider.geocode('서울-종로구')
      ).rejects.toMatchObject({
        name: 'WeatherProviderError',
        code: 'PROVIDER_NOT_IMPLEMENTED',
        provider: 'openweather',
      });
    });

    test('API가 200이 아닌 상태를 반환하면 INVALID_PROVIDER_RESPONSE 오류를 발생시킨다', async () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-key');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      await expect(
        realWeatherProvider.geocode('서울-종로구')
      ).rejects.toMatchObject({
        name: 'WeatherProviderError',
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
      });
    });

    test('네트워크 오류 시 INVALID_PROVIDER_RESPONSE 오류를 발생시킨다', async () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-key');
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(
        realWeatherProvider.geocode('서울-종로구')
      ).rejects.toMatchObject({
        name: 'WeatherProviderError',
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
      });
    });

    test('유효한 API 응답을 LocationGeocodeCandidate 배열로 변환한다', async () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'test-key');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json([
          {
            name: '종로구',
            state: '서울특별시',
            country: 'KR',
            lat: 37.5729,
            lon: 126.9794,
          },
        ])
      );

      const candidates = await realWeatherProvider.geocode('서울-종로구');

      expect(candidates).toEqual([
        {
          name: '종로구',
          admin1: '서울특별시',
          countryCode: 'KR',
          latitude: 37.5729,
          longitude: 126.9794,
        },
      ]);
    });

    test('올바른 URL로 API를 호출한다', async () => {
      vi.stubEnv('VITE_OPENWEATHER_API_KEY', 'my-api-key');
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(Response.json([]));

      await realWeatherProvider.geocode('서울-종로구');

      const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        'https://api.openweathermap.org/geo/1.0/direct'
      );
      expect(calledUrl.searchParams.get('q')).toBe('서울-종로구');
      expect(calledUrl.searchParams.get('limit')).toBe('5');
      expect(calledUrl.searchParams.get('appid')).toBe('my-api-key');
    });
  });
});
