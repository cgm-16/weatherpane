import { describe, expect, test } from 'vitest';
import { coreWeatherToSnapshot } from '../frontend/entities/weather/model/core-weather-to-snapshot';
import { aqiToSnapshot } from '../frontend/entities/aqi/model/aqi-to-snapshot';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';

const mockWeather: CoreWeather = {
  locationId: 'loc_abc',
  fetchedAt: '2026-04-12T10:00:00Z',
  observedAt: '2026-04-12T09:50:00Z',
  current: {
    temperatureC: 18,
    condition: {
      code: 'CLEAR',
      text: '맑음',
      isDay: true,
      visualBucket: 'clear',
      textMapping: { conditionCode: 'CLEAR', isDay: true, precipitationKind: 'none', cloudCoverPct: 5, intensity: 'none' },
    },
  },
  today: { minC: 10, maxC: 22 },
  hourly: [],
  source: { provider: 'mock-openweather' },
};

const mockAqi: Aqi = {
  locationId: 'loc_abc',
  fetchedAt: '2026-04-12T10:00:00Z',
  observedAt: '2026-04-12T09:45:00Z',
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock-openweather' },
};

describe('coreWeatherToSnapshot', () => {
  test('locationId, fetchedAt, observedAt를 그대로 유지한다', () => {
    const s = coreWeatherToSnapshot(mockWeather);
    expect(s.locationId).toBe('loc_abc');
    expect(s.fetchedAt).toBe('2026-04-12T10:00:00Z');
    expect(s.observedAt).toBe('2026-04-12T09:50:00Z');
  });
  test('current 온도를 temperatureC로 평탄화한다', () => {
    expect(coreWeatherToSnapshot(mockWeather).temperatureC).toBe(18);
  });
  test('컨디션 코드와 텍스트를 평탄화한다', () => {
    const s = coreWeatherToSnapshot(mockWeather);
    expect(s.conditionCode).toBe('CLEAR');
    expect(s.conditionText).toBe('맑음');
  });
  test('today 최저/최고를 평탄화한다', () => {
    const s = coreWeatherToSnapshot(mockWeather);
    expect(s.todayMinC).toBe(10);
    expect(s.todayMaxC).toBe(22);
  });
  test('source를 그대로 유지한다', () => {
    expect(coreWeatherToSnapshot(mockWeather).source).toEqual({ provider: 'mock-openweather' });
  });
});

describe('aqiToSnapshot', () => {
  test('locationId, fetchedAt, observedAt를 그대로 유지한다', () => {
    const s = aqiToSnapshot(mockAqi);
    expect(s.locationId).toBe('loc_abc');
    expect(s.fetchedAt).toBe('2026-04-12T10:00:00Z');
    expect(s.observedAt).toBe('2026-04-12T09:45:00Z');
  });
  test('summary.aqi를 평탄화한다', () => {
    expect(aqiToSnapshot(mockAqi).aqi).toBe(2);
  });
  test('summary.category를 평탄화한다', () => {
    expect(aqiToSnapshot(mockAqi).category).toBe('fair');
  });
  test('source를 그대로 유지한다', () => {
    expect(aqiToSnapshot(mockAqi).source).toEqual({ provider: 'mock-openweather' });
  });
});
