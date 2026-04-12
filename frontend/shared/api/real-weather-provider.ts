import type { LocationGeocodeCandidate } from '../../entities/location';
import type { WeatherProvider } from './weather-provider';
import { WeatherProviderError } from './weather-provider-error';

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
  async geocode(): Promise<LocationGeocodeCandidate[]> {
    throw new WeatherProviderError({
      code: 'PROVIDER_NOT_IMPLEMENTED',
      provider: 'openweather',
      message: '지오코딩 어댑터가 아직 구현되지 않았습니다.',
    });
  },
};
