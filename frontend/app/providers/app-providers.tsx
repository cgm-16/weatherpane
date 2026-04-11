import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { createWeatherProvider } from '~/shared/api/create-weather-provider';
import {
  getDevProviderModeOverride,
  parseAppConfig,
} from '~/shared/lib/env-config';
import type { ConfigError } from '~/shared/lib/env-config';
import { WeatherProviderContext } from '~/shared/api/weather-provider';

// Resolved once at startup — not reactive to env changes at runtime.
const configResult = parseAppConfig();
const devOverride = getDevProviderModeOverride();
const resolvedMode =
  devOverride ?? (configResult.ok ? configResult.config.providerMode : 'mock');
const weatherProvider = createWeatherProvider(resolvedMode);

// Exported for future error-screen consumption (will move to React context in a later task).
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
