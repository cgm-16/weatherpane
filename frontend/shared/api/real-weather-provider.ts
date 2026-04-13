import type { LocationGeocodeCandidate } from '../../entities/location';
import type { WeatherProvider } from './weather-provider';
import { WeatherProviderError } from './weather-provider-error';

// OpenWeather Geocoding API 응답의 개별 항목 형태
interface OpenWeatherGeocodeEntry {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}

export const realWeatherProvider: WeatherProvider = {
  mode: 'real',
  async getCoreWeather() {
    throw new WeatherProviderError({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
      message: 'OpenWeather 핵심 날씨 어댑터가 아직 구현되지 않았습니다.',
    });
  },
  async getAqi() {
    throw new WeatherProviderError({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
      message: 'OpenWeather AQI 어댑터가 아직 구현되지 않았습니다.',
    });
  },
  async geocode(query: string): Promise<LocationGeocodeCandidate[]> {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new WeatherProviderError({
        code: 'PROVIDER_NOT_IMPLEMENTED',
        provider: 'openweather',
        message: 'VITE_OPENWEATHER_API_KEY가 설정되지 않았습니다.',
      });
    }

    const url = new URL('https://api.openweathermap.org/geo/1.0/direct');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '5');
    url.searchParams.set('appid', apiKey);

    let response: Response;
    try {
      response = await fetch(url.toString());
    } catch (cause) {
      throw new WeatherProviderError({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
        message: '지오코딩 API 네트워크 오류가 발생했습니다.',
        cause,
      });
    }

    if (!response.ok) {
      throw new WeatherProviderError({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
        message: `지오코딩 API 오류: ${response.status}`,
      });
    }

    const data = (await response.json()) as OpenWeatherGeocodeEntry[];

    return data.map((item) => ({
      name: item.name,
      admin1: item.state,
      countryCode: item.country,
      latitude: item.lat,
      longitude: item.lon,
    }));
  },
};
