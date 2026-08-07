import type { LocationGeocodeCandidate } from '../../entities/location';
import type { ResolvedLocation } from '../../entities/location';
import type { WeatherProvider } from './weather-provider';
import { WeatherProviderError } from './weather-provider-error';
import { normalizeOpenWeatherCoreWeatherResponse } from '../../entities/weather/api/openweather';
import { normalizeOpenWeatherAqiResponse } from '../../entities/aqi/api/openweather';
import { roundCoordinate } from '../lib/round-coordinate';

// OpenWeather Geocoding API 응답의 개별 항목 형태
interface OpenWeatherGeocodeEntry {
  name: string;
  // 언어별 현지 명칭 맵 (예: { ko: '서울특별시', en: 'Seoul' })
  local_names?: Record<string, string>;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

interface ProxyErrorBody {
  code?: string;
  message?: string;
}

// 프록시(우리 서버) 응답이 멈췄을 때 클라이언트가 무한 대기하지 않도록 하는 타임아웃.
// 서버 홉(5s)보다 길게 두어 서버의 정식 502가 먼저 반환되도록 한다.
const PROXY_TIMEOUT_MS = 8_000;

// 서버 전용 프록시 라우트(app/routes/v1.weather.*.ts, v1.geocode.ts)를 호출한다.
// OpenWeather API 키는 클라이언트에 전혀 노출되지 않고 프록시 내부에서만 다뤄진다.
async function fetchProxy(
  path: string,
  params: Record<string, string>,
  errorMessage: string
): Promise<unknown> {
  const query = new URLSearchParams(params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(`${path}?${query.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as ProxyErrorBody | null;
      if (body?.code === 'PROVIDER_NOT_IMPLEMENTED') {
        throw new WeatherProviderError({
          code: 'PROVIDER_NOT_IMPLEMENTED',
          provider: 'openweather',
          message: body.message ?? errorMessage,
        });
      }
      throw new WeatherProviderError({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
        message: `${errorMessage}: ${response.status}`,
      });
    }

    return await response.json();
  } catch (cause) {
    // 위 블록에서 던진 계약 오류는 그대로 전파한다.
    if (cause instanceof WeatherProviderError) {
      throw cause;
    }
    // 타임아웃(abort)·네트워크 오류·JSON 파싱 실패를 INVALID_PROVIDER_RESPONSE로 매핑.
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'openweather',
      message: errorMessage,
      cause,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const realWeatherProvider: WeatherProvider = {
  mode: 'real',
  async getCoreWeather(location: ResolvedLocation) {
    const data = await fetchProxy(
      '/v1/weather/core',
      {
        lat: String(roundCoordinate(location.latitude)),
        lon: String(roundCoordinate(location.longitude)),
      },
      '날씨 API 네트워크 오류가 발생했습니다'
    );
    const result = normalizeOpenWeatherCoreWeatherResponse(
      { ...(data as object), fetchedAt: new Date().toISOString() },
      location
    );
    return { ...result, source: { provider: 'openweather' } };
  },
  async getAqi(location: ResolvedLocation) {
    const data = await fetchProxy(
      '/v1/weather/aqi',
      {
        lat: String(roundCoordinate(location.latitude)),
        lon: String(roundCoordinate(location.longitude)),
      },
      'AQI API 네트워크 오류가 발생했습니다'
    );
    const result = normalizeOpenWeatherAqiResponse(
      { ...(data as object), fetchedAt: new Date().toISOString() },
      location
    );
    return { ...result, source: { provider: 'openweather' } };
  },
  async geocode(query: string): Promise<LocationGeocodeCandidate[]> {
    const data = (await fetchProxy(
      '/v1/geocode',
      { q: query },
      '지오코딩 API 네트워크 오류가 발생했습니다'
    )) as OpenWeatherGeocodeEntry[];

    return data.map((item) => ({
      name: item.local_names?.ko ?? item.name,
      admin1: item.state,
      countryCode: item.country,
      latitude: item.lat,
      longitude: item.lon,
    }));
  },
};
