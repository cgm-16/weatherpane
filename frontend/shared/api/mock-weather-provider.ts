import type { WeatherProvider } from './weather-provider';
import {
  mockOpenWeatherAqiFixture,
  mockOpenWeatherCoreWeatherFixture,
} from './mock-weather-fixtures';
import {
  normalizeOpenWeatherAqiResponse,
  normalizeOpenWeatherCoreWeatherResponse,
} from './openweather-normalizers';

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
};
