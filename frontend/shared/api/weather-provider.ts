import { createContext, use } from 'react';

import type { ProviderMode } from '~/shared/lib/env-config';

export interface WeatherProvider {
  readonly mode: ProviderMode;
  // 날씨 데이터 메서드는 T08+ 작업에서 추가됩니다.
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
