import { afterEach, describe, expect, test, vi } from 'vitest';

import { loader as coreLoader } from '../../app/routes/v1.weather.core';
import { loader as aqiLoader } from '../../app/routes/v1.weather.aqi';
import { loader as geocodeLoader } from '../../app/routes/v1.geocode';

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe('v1/weather/core loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('lat/lon이 없으면 400을 반환한다', async () => {
    const response = await coreLoader({
      request: makeRequest('/v1/weather/core'),
    });
    expect(response.status).toBe(400);
  });

  test('키가 설정되어 있으면 One Call 3.0 URL로 프록시한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ current: {} }));

    const response = await coreLoader({
      request: makeRequest('/v1/weather/core?lat=37.5&lon=127'),
    });

    expect(response.status).toBe(200);
    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://api.openweathermap.org/data/3.0/onecall'
    );
    expect(calledUrl.searchParams.get('lat')).toBe('37.5');
    expect(calledUrl.searchParams.get('lon')).toBe('127');
    expect(calledUrl.searchParams.get('units')).toBe('metric');
    expect(calledUrl.searchParams.get('exclude')).toBe('minutely,alerts');
    expect(calledUrl.searchParams.get('appid')).toBe('test-key');
  });

  test('성공 응답에 s-maxage=600 캐시 헤더를 설정한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ current: {} })
    );
    const response = await coreLoader({
      request: makeRequest('/v1/weather/core?lat=37.5&lon=127'),
    });
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=600');
  });

  test('lat/lon 누락 시 no-store로 응답한다', async () => {
    const response = await coreLoader({
      request: makeRequest('/v1/weather/core'),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('lat/lon을 소수점 2자리로 반올림해 업스트림에 전달한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ current: {} }));
    await coreLoader({
      request: makeRequest('/v1/weather/core?lat=37.5729&lon=126.9794'),
    });
    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('lat')).toBe('37.57');
    expect(calledUrl.searchParams.get('lon')).toBe('126.98');
  });

  test('업스트림 오류 응답(예: 500)은 no-store로 응답한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('upstream error', { status: 500 })
    );
    const response = await coreLoader({
      request: makeRequest('/v1/weather/core?lat=37.5&lon=127'),
    });
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('v1/weather/aqi loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('lat/lon이 없으면 400을 반환한다', async () => {
    const response = await aqiLoader({
      request: makeRequest('/v1/weather/aqi'),
    });
    expect(response.status).toBe(400);
  });

  test('키가 설정되어 있으면 Air Pollution URL로 프록시한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ list: [] }));

    const response = await aqiLoader({
      request: makeRequest('/v1/weather/aqi?lat=37.5&lon=127'),
    });

    expect(response.status).toBe(200);
    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://api.openweathermap.org/data/2.5/air_pollution'
    );
    expect(calledUrl.searchParams.get('appid')).toBe('test-key');
    expect(calledUrl.searchParams.get('lat')).toBe('37.5');
    expect(calledUrl.searchParams.get('lon')).toBe('127');
  });

  test('성공 응답에 s-maxage=1800 캐시 헤더를 설정한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ list: [] })
    );
    const response = await aqiLoader({
      request: makeRequest('/v1/weather/aqi?lat=37.5&lon=127'),
    });
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=1800');
  });

  test('lat/lon 누락 시 no-store로 응답한다', async () => {
    const response = await aqiLoader({
      request: makeRequest('/v1/weather/aqi'),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('lat/lon을 소수점 2자리로 반올림해 업스트림에 전달한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ list: [] }));
    await aqiLoader({
      request: makeRequest('/v1/weather/aqi?lat=37.5729&lon=126.9794'),
    });
    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('lat')).toBe('37.57');
    expect(calledUrl.searchParams.get('lon')).toBe('126.98');
  });
});

describe('v1/geocode loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('q가 없으면 400을 반환한다', async () => {
    const response = await geocodeLoader({
      request: makeRequest('/v1/geocode'),
    });
    expect(response.status).toBe(400);
  });

  test('키가 설정되어 있으면 Geocoding URL로 프록시한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([]));

    const response = await geocodeLoader({
      request: makeRequest('/v1/geocode?q=%EC%84%9C%EC%9A%B8'),
    });

    expect(response.status).toBe(200);
    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      'https://api.openweathermap.org/geo/1.0/direct'
    );
    expect(calledUrl.searchParams.get('q')).toBe('서울');
    expect(calledUrl.searchParams.get('limit')).toBe('5');
    expect(calledUrl.searchParams.get('appid')).toBe('test-key');
  });

  test('성공 응답에 s-maxage=86400 캐시 헤더를 설정한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json([]));
    const response = await geocodeLoader({
      request: makeRequest('/v1/geocode?q=%EC%84%9C%EC%9A%B8'),
    });
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });

  test('q 누락 시 no-store로 응답한다', async () => {
    const response = await geocodeLoader({
      request: makeRequest('/v1/geocode'),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
