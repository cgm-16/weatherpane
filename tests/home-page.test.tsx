// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

vi.mock('../frontend/features/app-bootstrap/use-home-bootstrap', () => ({
  useHomeBootstrap: vi.fn(),
}));

// useWeatherRefresh는 home-page.tsx에서 useQueryClient를 대체한다.
vi.mock('../frontend/features/weather-queries/use-weather-refresh', () => ({
  useWeatherRefresh: vi.fn(() => vi.fn()),
}));

// HomeDashboard는 useFavorites를 사용한다.
vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    isFavorite: vi.fn(() => false),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    undoEntry: null,
    undoRemove: vi.fn(),
    atMaxFavorites: false,
    isHydrated: true,
    updateNickname: vi.fn(),
    reorderFavorites: vi.fn(),
  })),
}));

vi.mock('../frontend/features/settings', () => ({
  useSettings: vi.fn(() => ({ temperatureUnit: 'F' })),
}));

import { useHomeBootstrap } from '../frontend/features/app-bootstrap/use-home-bootstrap';
import { useSettings } from '../frontend/features/settings';
import { HomePage } from '../frontend/pages/home/ui/home-page';
import {
  SketchManifestProvider,
  BASELINE_MANIFEST,
} from '../frontend/entities/asset';

const loc = {
  kind: 'resolved' as const,
  locationId: 'loc_test',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

function settingsValue(
  temperatureUnit: 'C' | 'F'
): ReturnType<typeof useSettings> {
  return {
    temperatureUnit,
    motionPreference: 'system',
    reduceMotion: false,
    setTemperatureUnit: vi.fn(),
    setMotionPreference: vi.fn(),
  };
}

function renderPage() {
  return render(
    <SketchManifestProvider manifest={BASELINE_MANIFEST}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </SketchManifestProvider>
  );
}

describe('HomePage 상태별 렌더링', () => {
  beforeEach(() => {
    vi.mocked(useSettings).mockReturnValue(settingsValue('C'));
  });

  test('no-location → 지역 검색 링크를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({ kind: 'no-location' });
    renderPage();
    const searchLink = screen.getByRole('link', { name: '지역 검색' });

    expect(searchLink).toBeInTheDocument();
    expect(searchLink).toHaveClass(
      'bg-primary',
      'text-on-primary',
      'hover:bg-primary-container',
      'hover:text-on-primary-container'
    );
  });

  test('loading → 로딩 메시지를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({ kind: 'loading' });
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  test('config-error → 설정 업데이트가 필요합니다 제목을 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'config-error',
      error: {
        code: 'INVALID_PROVIDER_MODE',
        field: 'VITE_WEATHER_PROVIDER_MODE',
        message: '값이 설정되지 않았습니다',
      },
    });
    renderPage();
    expect(
      screen.getByRole('heading', { name: '설정 업데이트가 필요합니다' })
    ).toBeInTheDocument();
  });

  test('recoverable-error → 공유 유리 컨테이너와 다시 시도 버튼을 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'recoverable-error',
      location: loc,
    });
    renderPage();

    const card = screen.getByRole('heading', {
      name: '연결이 끊겼습니다',
    }).parentElement;

    const retryButton = screen.getByRole('button', { name: /다시 시도/ });
    const errorCode = screen.getByText('오류 코드: CONNECTION_FAILED');

    expect(retryButton).toBeInTheDocument();
    expect(card).toHaveClass(
      'bg-surface-container-highest/60',
      'backdrop-blur-[20px]',
      'dark:bg-surface-bright/40',
      'flex',
      'w-full',
      'max-w-md',
      'flex-col',
      'items-center',
      'rounded-lg',
      'p-8',
      'text-center'
    );
    expect(retryButton).toHaveClass(
      'bg-primary',
      'text-on-primary',
      'hover:bg-primary-container',
      'hover:text-on-primary-container'
    );
    expect(errorCode).toHaveClass('text-on-surface-variant');
    expect(errorCode).not.toHaveClass('text-on-surface-variant/60');
  });

  test('stale-fallback → 선택한 화씨 단위로 기온, 최고·최저 기온을 표시한다', () => {
    vi.mocked(useSettings).mockReturnValue(settingsValue('F'));
    const now = new Date().toISOString();
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'stale-fallback',
      location: loc,
      weather: {
        locationId: 'loc_test',
        fetchedAt: now,
        observedAt: now,
        temperatureC: 17.2,
        conditionCode: 'CLEAR',
        conditionText: '맑음',
        todayMinC: 10,
        todayMaxC: 22,
        source: { provider: 'mock' },
      },
      aqi: null,
    });
    renderPage();
    expect(screen.getByText('63°')).toBeInTheDocument();
    expect(screen.getByText('H 72°')).toBeInTheDocument();
    expect(screen.getByText('L 50°')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /마지막 업데이트 시각/ })
    ).toBeInTheDocument();
  });

  test('data → 기온과 AQI 카테고리를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'data',
      location: loc,
      isRefreshing: false,
      hasRefreshError: false,
      weather: {
        locationId: 'loc_test',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        current: {
          temperatureC: 18,
          condition: {
            code: 'CLEAR',
            text: '맑음',
            isDay: true,
            visualBucket: 'clear',
            textMapping: {
              conditionCode: 'CLEAR',
              isDay: true,
              precipitationKind: 'none',
              cloudCoverPct: 5,
              intensity: 'none',
            },
          },
        },
        today: { minC: 10, maxC: 22 },
        daily: [],
        hourly: [],
        source: { provider: 'mock' },
      },
      aqi: {
        locationId: 'loc_test',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        summary: { aqi: 2, category: 'fair' },
        pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
        source: { provider: 'mock' },
      },
    });
    renderPage();
    expect(screen.getByText(/18°/)).toBeInTheDocument();
    // AQI 카테고리 라벨은 한국어: 'fair'는 '보통'으로 표시된다.
    expect(screen.getByText('보통')).toBeInTheDocument();
  });
});
