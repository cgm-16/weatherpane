import { describe, expect, test } from 'vitest';
import { weatherQueryKeys } from '../frontend/features/weather-queries/query-keys';
import {
  coreWeatherQueryOptions,
  aqiQueryOptions,
  CORE_WEATHER_STALE_TIME,
  AQI_STALE_TIME,
} from '../frontend/features/weather-queries/weather-query-options';
import { mockWeatherProvider } from '../frontend/shared/api/mock-weather-provider';
import type { ResolvedLocation } from '../frontend/entities/location';

const testLocation: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_test123',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
};

describe('weatherQueryKeys', () => {
  describe('coreWeather', () => {
    test('key starts with ["weather", "core"]', () => {
      const key = weatherQueryKeys.coreWeather('loc_abc');
      expect(key[0]).toBe('weather');
      expect(key[1]).toBe('core');
    });

    test('key includes locationId as third element', () => {
      const key = weatherQueryKeys.coreWeather('loc_abc');
      expect(key[2]).toBe('loc_abc');
    });

    test('different locationIds produce different keys', () => {
      const a = weatherQueryKeys.coreWeather('loc_aaa');
      const b = weatherQueryKeys.coreWeather('loc_bbb');
      expect(a).not.toEqual(b);
    });

    test('key is exactly 3 elements', () => {
      const key = weatherQueryKeys.coreWeather('loc_abc');
      expect(key).toHaveLength(3);
    });
  });

  describe('aqi', () => {
    test('key starts with ["weather", "aqi"]', () => {
      const key = weatherQueryKeys.aqi('loc_abc');
      expect(key[0]).toBe('weather');
      expect(key[1]).toBe('aqi');
    });

    test('key includes locationId as third element', () => {
      const key = weatherQueryKeys.aqi('loc_abc');
      expect(key[2]).toBe('loc_abc');
    });

    test('coreWeather and aqi keys differ for same locationId', () => {
      const cw = weatherQueryKeys.coreWeather('loc_abc');
      const aq = weatherQueryKeys.aqi('loc_abc');
      expect(cw).not.toEqual(aq);
    });

    test('key is exactly 3 elements', () => {
      const key = weatherQueryKeys.aqi('loc_abc');
      expect(key).toHaveLength(3);
    });
  });
});

describe('coreWeatherQueryOptions', () => {
  test('CORE_WEATHER_STALE_TIME is 10 minutes in ms', () => {
    expect(CORE_WEATHER_STALE_TIME).toBe(10 * 60 * 1000);
  });

  test('queryKey matches weatherQueryKeys.coreWeather', () => {
    const opts = coreWeatherQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.queryKey).toEqual(['weather', 'core', testLocation.locationId]);
  });

  test('staleTime is 10 minutes', () => {
    const opts = coreWeatherQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.staleTime).toBe(10 * 60 * 1000);
  });

  test('retry is 1', () => {
    const opts = coreWeatherQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.retry).toBe(1);
  });

  test('refetchOnWindowFocus is true', () => {
    const opts = coreWeatherQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.refetchOnWindowFocus).toBe(true);
  });

  test('queryFn resolves with CoreWeather for the location', async () => {
    const opts = coreWeatherQueryOptions(testLocation, mockWeatherProvider);
    const result = await (opts.queryFn as () => Promise<unknown>)();
    expect((result as { locationId: string }).locationId).toBe(
      testLocation.locationId
    );
  });
});

describe('aqiQueryOptions', () => {
  test('AQI_STALE_TIME is 30 minutes in ms', () => {
    expect(AQI_STALE_TIME).toBe(30 * 60 * 1000);
  });

  test('queryKey matches weatherQueryKeys.aqi', () => {
    const opts = aqiQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.queryKey).toEqual(['weather', 'aqi', testLocation.locationId]);
  });

  test('staleTime is 30 minutes', () => {
    const opts = aqiQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.staleTime).toBe(30 * 60 * 1000);
  });

  test('retry is 1', () => {
    const opts = aqiQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.retry).toBe(1);
  });

  test('refetchOnWindowFocus is true', () => {
    const opts = aqiQueryOptions(testLocation, mockWeatherProvider);
    expect(opts.refetchOnWindowFocus).toBe(true);
  });

  test('queryFn resolves with Aqi for the location', async () => {
    const opts = aqiQueryOptions(testLocation, mockWeatherProvider);
    const result = await (opts.queryFn as () => Promise<unknown>)();
    expect((result as { locationId: string }).locationId).toBe(
      testLocation.locationId
    );
  });
});
