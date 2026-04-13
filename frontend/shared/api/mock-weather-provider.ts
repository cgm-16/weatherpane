import type { LocationGeocodeCandidate } from '../../entities/location';
import type { WeatherProvider } from './weather-provider';
import {
  mockOpenWeatherAqiFixture,
  normalizeOpenWeatherAqiResponse,
} from '../../entities/aqi/api/openweather';
import {
  mockOpenWeatherCoreWeatherFixture,
  normalizeOpenWeatherCoreWeatherResponse,
} from '../../entities/weather/api/openweather';

export const mockWeatherProvider: WeatherProvider = {
  mode: 'mock',
  async getCoreWeather(location) {
    return normalizeOpenWeatherCoreWeatherResponse(
      mockOpenWeatherCoreWeatherFixture,
      location
    );
  },
  async getAqi(location) {
    return normalizeOpenWeatherAqiResponse(mockOpenWeatherAqiFixture, location);
  },
  async geocode(query: string): Promise<LocationGeocodeCandidate[]> {
    // 쿼리 문자열을 그대로 name으로 사용하여 한국 지오코딩 결과를 시뮬레이션합니다.
    const segments = query.split('-');
    const name = segments[segments.length - 1];
    const admin1 = segments[0];
    const admin2 = segments.length >= 3 ? segments[1] : undefined;
    return [
      {
        name,
        admin1,
        ...(admin2 ? { admin2 } : {}),
        countryCode: 'KR',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
    ];
  },
};
