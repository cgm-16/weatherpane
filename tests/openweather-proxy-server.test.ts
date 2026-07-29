import { afterEach, describe, expect, test, vi } from 'vitest';

import { proxyOpenWeatherRequest } from '../frontend/shared/api/openweather-proxy.server';

describe('proxyOpenWeatherRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('OPENWEATHER_API_KEY가 없으면 501과 PROVIDER_NOT_IMPLEMENTED를 반환한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '');

    const response = await proxyOpenWeatherRequest(
      new URL('https://api.openweathermap.org/data/3.0/onecall'),
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.code).toBe('PROVIDER_NOT_IMPLEMENTED');
  });

  test('키가 있으면 appid 파라미터를 추가해 업스트림을 호출한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ ok: true }));

    await proxyOpenWeatherRequest(
      new URL(
        'https://api.openweathermap.org/data/3.0/onecall?lat=37.5&lon=127'
      ),
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('appid')).toBe('test-key');
    expect(calledUrl.searchParams.get('lat')).toBe('37.5');
  });

  test('업스트림 응답을 그대로 전달한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ current: { temp: 17.2 } })
    );

    const response = await proxyOpenWeatherRequest(
      new URL('https://api.openweathermap.org/data/3.0/onecall'),
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ current: { temp: 17.2 } });
  });

  test('업스트림이 오류 상태를 반환하면 상태 코드를 그대로 전달하고 INVALID_PROVIDER_RESPONSE를 반환한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    );

    const response = await proxyOpenWeatherRequest(
      new URL('https://api.openweathermap.org/data/3.0/onecall'),
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('INVALID_PROVIDER_RESPONSE');
    expect(JSON.stringify(body)).not.toContain('test-key');
  });

  test('네트워크 오류 시 502와 INVALID_PROVIDER_RESPONSE를 반환한다', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('fetch failed')
    );

    const response = await proxyOpenWeatherRequest(
      new URL('https://api.openweathermap.org/data/3.0/onecall'),
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe('INVALID_PROVIDER_RESPONSE');
    expect(JSON.stringify(body)).not.toContain('test-key');
  });

  test('호출자가 전달한 URL 객체는 변형되지 않는다 (키가 호출자 쪽에 남지 않는다)', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ ok: true })
    );

    const callerUrl = new URL(
      'https://api.openweathermap.org/data/3.0/onecall?lat=37.5'
    );
    await proxyOpenWeatherRequest(
      callerUrl,
      '날씨 API 네트워크 오류가 발생했습니다'
    );

    expect(callerUrl.searchParams.has('appid')).toBe(false);
  });
});
