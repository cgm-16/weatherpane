import type { LocationGeocodeCandidate } from '../../entities/location';
import type { ResolvedLocation } from '../../entities/location';
import type { WeatherProvider } from './weather-provider';
import { WeatherProviderError } from './weather-provider-error';
import { normalizeOpenWeatherCoreWeatherResponse } from '../../entities/weather/api/openweather';
import { normalizeOpenWeatherAqiResponse } from '../../entities/aqi/api/openweather';

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

// 서버 전용 프록시 라우트(app/routes/v1.weather.*.ts, v1.geocode.ts)를 호출한다.
// OpenWeather API 키는 클라이언트에 전혀 노출되지 않고 프록시 내부에서만 다뤄진다.
async function fetchProxy(
  path: string,
  params: Record<string, string>,
  errorMessage: string
): Promise<unknown> {
  const query = new URLSearchParams(params);
  let response: Response;
  try {
    response = await fetch(`${path}?${query.toString()}`);
  } catch (cause) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'openweather',
      message: errorMessage,
      cause,
    });
  }

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

  return response.json();
}

export const realWeatherProvider: WeatherProvider = {
  mode: 'real',
  async getCoreWeather(location: ResolvedLocation) {
    const data = await fetchProxy(
      '/v1/weather/core',
      { lat: String(location.latitude), lon: String(location.longitude) },
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
      { lat: String(location.latitude), lon: String(location.longitude) },
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
