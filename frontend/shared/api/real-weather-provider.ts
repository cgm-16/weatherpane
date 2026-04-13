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

async function fetchOwm(url: URL, errorMessage: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (cause) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'openweather',
      message: errorMessage,
      cause,
    });
  }

  if (!response.ok) {
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'openweather',
      message: `${errorMessage}: ${response.status}`,
    });
  }

  return response.json();
}

function requireApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new WeatherProviderError({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
      message: 'VITE_OPENWEATHER_API_KEY가 설정되지 않았습니다.',
    });
  }
  return apiKey;
}

export const realWeatherProvider: WeatherProvider = {
  mode: 'real',
  async getCoreWeather(location: ResolvedLocation) {
    const apiKey = requireApiKey();

    const url = new URL('https://api.openweathermap.org/data/3.0/onecall');
    url.searchParams.set('lat', String(location.latitude));
    url.searchParams.set('lon', String(location.longitude));
    url.searchParams.set('exclude', 'minutely,alerts');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', apiKey);

    const data = await fetchOwm(url, '날씨 API 네트워크 오류가 발생했습니다');
    const result = normalizeOpenWeatherCoreWeatherResponse(
      { ...(data as object), fetchedAt: new Date().toISOString() },
      location
    );
    return { ...result, source: { provider: 'openweather' } };
  },
  async getAqi(location: ResolvedLocation) {
    const apiKey = requireApiKey();

    const url = new URL(
      'https://api.openweathermap.org/data/2.5/air_pollution'
    );
    url.searchParams.set('lat', String(location.latitude));
    url.searchParams.set('lon', String(location.longitude));
    url.searchParams.set('appid', apiKey);

    const data = await fetchOwm(url, 'AQI API 네트워크 오류가 발생했습니다');
    const result = normalizeOpenWeatherAqiResponse(
      { ...(data as object), fetchedAt: new Date().toISOString() },
      location
    );
    return { ...result, source: { provider: 'openweather' } };
  },
  async geocode(query: string): Promise<LocationGeocodeCandidate[]> {
    const apiKey = requireApiKey();

    const url = new URL('https://api.openweathermap.org/geo/1.0/direct');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '5');
    url.searchParams.set('appid', apiKey);

    const data = (await fetchOwm(
      url,
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
