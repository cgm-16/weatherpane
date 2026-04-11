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
};
