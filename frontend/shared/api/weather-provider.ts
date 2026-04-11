import { createContext, use } from 'react';

import type { Aqi } from '~/entities/aqi/model/aqi';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';
import type { ProviderMode } from '~/shared/lib/env-config';

export interface WeatherProvider {
  readonly mode: ProviderMode;
  getCoreWeather(location: ResolvedLocation): Promise<CoreWeather>;
  getAqi(location: ResolvedLocation): Promise<Aqi>;
}

export const WeatherProviderContext = createContext<WeatherProvider | null>(
  null
);

export function useWeatherProvider(): WeatherProvider {
  const provider = use(WeatherProviderContext);
  if (!provider)
    throw new Error('useWeatherProvider must be used within AppProviders');
  return provider;
}
