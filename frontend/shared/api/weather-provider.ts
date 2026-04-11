import { createContext, use } from 'react';

import type { ProviderMode } from '~/shared/lib/env-config';

export interface WeatherProvider {
  readonly mode: ProviderMode;
  // Weather data methods will be added in T08+ tasks
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
