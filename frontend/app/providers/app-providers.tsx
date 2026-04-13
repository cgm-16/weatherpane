import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { createWeatherProvider } from '~/shared/api/create-weather-provider';
import {
  getDevProviderModeOverride,
  parseAppConfig,
} from '~/shared/lib/env-config';
import type { ConfigError } from '~/shared/lib/env-config';
import { WeatherProviderContext } from '~/shared/api/weather-provider';
import { ActiveLocationProvider } from '~/features/app-bootstrap/active-location-context';
import { ThemeProvider } from '~/shared/hooks/use-theme';
import { SketchManifestProvider, loadSessionManifest } from '~/entities/asset';
import { HomeConfigError } from '~/pages/home/ui/home-config-error';
import { isProduction } from '~/shared/lib/runtime-env';
import { AppEffects } from './app-effects';
import { DevProviderToggle } from '~/shared/ui/dev-provider-toggle';

// 시작 시 한 번만 파싱되며 런타임 중 환경 변수 변경에 반응하지 않습니다.
const configResult = parseAppConfig();
const devOverride = getDevProviderModeOverride();
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
  // 세션 시작 시 한 번만 스케치 매니페스트를 로드한다. 다음 세션용 원격 갱신은 비동기로 기록된다.
  const [sketchManifest] = useState(() => loadSessionManifest());

  // 프로덕션에서 설정 오류 발생 시 전체 화면 오버레이를 표시한다. 개발/테스트(mock) 모드에서는 항상 유효.
  const configError = getConfigError();
  if (isProduction() && configError) {
    return (
      <ThemeProvider>
        <HomeConfigError error={configError} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <WeatherProviderContext value={weatherProvider}>
          <ActiveLocationProvider>
            <SketchManifestProvider manifest={sketchManifest}>
              <AppEffects />
              {children}
              <DevProviderToggle currentMode={resolvedMode} />
            </SketchManifestProvider>
          </ActiveLocationProvider>
        </WeatherProviderContext>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
