import type { ProviderMode } from '~/shared/lib/env-config';

import { mockWeatherProvider } from './mock-weather-provider';
import { realWeatherProvider } from './real-weather-provider';
import type { WeatherProvider } from './weather-provider';

export function createWeatherProvider(mode: ProviderMode): WeatherProvider {
  return mode === 'real' ? realWeatherProvider : mockWeatherProvider;
}
