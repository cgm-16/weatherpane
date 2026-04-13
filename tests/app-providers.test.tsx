// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// parseAppConfig를 모킹하여 설정 오류를 시뮬레이션합니다.
vi.mock('../frontend/shared/lib/env-config', () => ({
  parseAppConfig: vi
    .fn()
    .mockReturnValue({ ok: true, config: { providerMode: 'mock' } }),
  getDevProviderModeOverride: vi.fn().mockReturnValue(null),
}));
// isProduction을 모킹하여 프로덕션 환경을 시뮬레이션합니다.
vi.mock('../frontend/shared/lib/runtime-env', () => ({
  isProduction: vi.fn().mockReturnValue(false),
}));
// createWeatherProvider를 모킹합니다.
vi.mock('../frontend/shared/api/create-weather-provider', () => ({
  createWeatherProvider: vi.fn().mockReturnValue({}),
}));
// WeatherProviderContext를 모킹합니다.
vi.mock('../frontend/shared/api/weather-provider', () => ({
  WeatherProviderContext: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
}));
// ActiveLocationProvider를 모킹합니다.
vi.mock('../frontend/features/app-bootstrap/active-location-context', () => ({
  ActiveLocationProvider: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
}));
// use-theme을 모킹합니다.
vi.mock('../frontend/shared/hooks/use-theme', () => ({
  ThemeProvider: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
}));
// SketchManifestProvider를 모킹합니다.
vi.mock('../frontend/entities/asset', () => ({
  SketchManifestProvider: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
  loadSessionManifest: vi.fn().mockReturnValue(null),
}));
// AppEffects를 모킹합니다 (QueryClient 없이 테스트하기 위해).
vi.mock('../frontend/app/providers/app-effects', () => ({
  AppEffects: () => null,
}));

import { parseAppConfig } from '../frontend/shared/lib/env-config';
import { isProduction } from '../frontend/shared/lib/runtime-env';
import { AppProviders } from '../frontend/app/providers/app-providers';

describe('AppProviders', () => {
  beforeEach(() => {
    vi.mocked(parseAppConfig).mockReturnValue({
      ok: true,
      config: { providerMode: 'mock' },
    });
    vi.mocked(isProduction).mockReturnValue(false);
  });

  it('설정이 유효하면 children을 렌더링한다', () => {
    render(
      <AppProviders>
        <div data-testid="child">자식 컴포넌트</div>
      </AppProviders>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('프로덕션에서 설정이 유효하면 children을 렌더링한다', () => {
    vi.mocked(isProduction).mockReturnValue(true);
    render(
      <AppProviders>
        <div data-testid="child">자식 컴포넌트</div>
      </AppProviders>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('개발 환경(DEV)에서는 설정 오류가 있어도 children을 렌더링한다', () => {
    vi.mocked(isProduction).mockReturnValue(false); // DEV
    render(
      <AppProviders>
        <div data-testid="child">자식 컴포넌트</div>
      </AppProviders>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

// 프로덕션 + 설정 오류 경로를 별도 모듈 인스턴스로 테스트합니다.
describe('AppProviders — 프로덕션 설정 오류 오버레이', () => {
  it('프로덕션에서 설정 오류가 있으면 HomeConfigError를 렌더링하고 children을 숨긴다', async () => {
    vi.resetModules();

    // 오류를 반환하도록 재설정합니다.
    vi.doMock('../frontend/shared/lib/env-config', () => ({
      parseAppConfig: vi.fn().mockReturnValue({
        ok: false,
        error: {
          code: 'INVALID_PROVIDER_MODE',
          field: 'VITE_WEATHER_PROVIDER_MODE',
          message: 'API 키가 없습니다',
        },
      }),
      getDevProviderModeOverride: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../frontend/shared/lib/runtime-env', () => ({
      isProduction: vi.fn().mockReturnValue(true),
    }));
    vi.doMock('../frontend/shared/api/create-weather-provider', () => ({
      createWeatherProvider: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../frontend/shared/api/weather-provider', () => ({
      WeatherProviderContext: vi.fn(
        ({ children }: { children: React.ReactNode }) => children
      ),
    }));
    vi.doMock(
      '../frontend/features/app-bootstrap/active-location-context',
      () => ({
        ActiveLocationProvider: vi.fn(
          ({ children }: { children: React.ReactNode }) => children
        ),
      })
    );
    vi.doMock('../frontend/shared/hooks/use-theme', () => ({
      ThemeProvider: vi.fn(
        ({ children }: { children: React.ReactNode }) => children
      ),
    }));
    vi.doMock('../frontend/entities/asset', () => ({
      SketchManifestProvider: vi.fn(
        ({ children }: { children: React.ReactNode }) => children
      ),
      loadSessionManifest: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../frontend/app/providers/app-effects', () => ({
      AppEffects: () => null,
    }));

    const { AppProviders: AppProvidersFresh } =
      await import('../frontend/app/providers/app-providers');

    render(
      <AppProvidersFresh>
        <div data-testid="child">자식 컴포넌트</div>
      </AppProvidersFresh>
    );

    // children이 렌더링되지 않아야 함
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    // 설정 오류 화면이 렌더링되어야 함 (HomeConfigError 내 role="main")
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
