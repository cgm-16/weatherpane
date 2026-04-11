import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { createWeatherProvider } from '~/shared/api/create-weather-provider';
import {
  assertConfigInProduction,
  getDevProviderModeOverride,
  parseAppConfig,
} from '~/shared/lib/env-config';
import type { ConfigError } from '~/shared/lib/env-config';
import { WeatherProviderContext } from '~/shared/api/weather-provider';

// 시작 시 한 번만 파싱되며 런타임 중 환경 변수 변경에 반응하지 않습니다.
const configResult = parseAppConfig();
const devOverride = getDevProviderModeOverride();
assertConfigInProduction(configResult);
const resolvedMode =
  devOverride ?? (configResult.ok ? configResult.config.providerMode : 'mock');
const weatherProvider = createWeatherProvider(resolvedMode);

// 향후 에러 화면에서 소비하기 위해 내보냄 (이후 태스크에서 React 컨텍스트로 이동 예정).
export function getConfigError(): ConfigError | null {
  return configResult.ok ? null : configResult.error;
}

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WeatherProviderContext value={weatherProvider}>
        {children}
      </WeatherProviderContext>
    </QueryClientProvider>
  );
}
