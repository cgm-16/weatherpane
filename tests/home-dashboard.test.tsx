// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { HomeDashboard } from '../frontend/pages/home/ui/home-dashboard';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';

vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    isFavorite: vi.fn(() => false),
    toggleFavorite: vi.fn(),
    atMaxFavorites: false,
  })),
}));

import { useFavorites } from '../frontend/features/favorites/use-favorites';

const loc: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_test',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const condition = {
  code: 'CLEAR',
  text: '맑음',
  isDay: true,
  visualBucket: 'clear' as const,
  textMapping: {
    conditionCode: 'CLEAR',
    isDay: true,
    precipitationKind: 'none' as const,
    cloudCoverPct: 0,
    intensity: 'none' as const,
  },
};

const weather: CoreWeather = {
  locationId: 'loc_test',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  current: {
    temperatureC: 18,
    humidityPct: 56,
    condition,
  },
  today: { minC: 10, maxC: 22 },
  hourly: [],
  source: { provider: 'mock' },
};

const aqi: Aqi = {
  locationId: 'loc_test',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock' },
};

function renderDashboard(
  overrides: Partial<Parameters<typeof HomeDashboard>[0]> = {}
) {
  return render(
    <MemoryRouter>
      <HomeDashboard
        location={loc}
        weather={weather}
        aqi={aqi}
        isRefreshing={false}
        hasRefreshError={false}
        onRefresh={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>
  );
}

describe('HomeDashboard 콘텐츠 렌더링', () => {
  test('현재 기온을 표시한다', () => {
    renderDashboard();
    expect(screen.getByText(/18°/)).toBeInTheDocument();
  });

  test('날씨 상태 텍스트를 표시한다', () => {
    renderDashboard();
    expect(screen.getByText('맑음')).toBeInTheDocument();
  });

  test('오늘 최고·최저 기온을 표시한다', () => {
    renderDashboard();
    expect(screen.getByText(/22°/)).toBeInTheDocument();
    expect(screen.getByText(/10°/)).toBeInTheDocument();
  });

  test('AQI 카테고리를 표시한다', () => {
    renderDashboard();
    // 'fair' 카테고리는 한국어 레이블 '보통'으로 표시된다
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  test('습도를 표시한다', () => {
    renderDashboard();
    expect(screen.getByText(/56%/)).toBeInTheDocument();
  });

  test('humidityPct가 없으면 "—"을 표시한다', () => {
    const weatherNoHumidity: CoreWeather = {
      ...weather,
      current: { temperatureC: 18, condition },
    };
    renderDashboard({ weather: weatherNoHumidity });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('상세 보기 링크가 /location/KR-Seoul로 연결된다', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: /상세 보기/ })).toHaveAttribute(
      'href',
      '/location/KR-Seoul'
    );
  });

  test('위치 이름이 표시된다', () => {
    renderDashboard();
    expect(screen.getByText('서울')).toBeInTheDocument();
  });
});

describe('HomeDashboard 새로고침', () => {
  test('새로고침 버튼 클릭 시 onRefresh가 호출된다', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderDashboard({ onRefresh });
    await user.click(screen.getByRole('button', { name: /새로고침/ }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  test('isRefreshing이 true이면 새로고침 버튼이 비활성화된다', () => {
    renderDashboard({ isRefreshing: true });
    expect(screen.getByRole('button', { name: /새로고침/ })).toBeDisabled();
  });

  test('hasRefreshError이면 비차단 오류 메시지가 표시된다', () => {
    renderDashboard({ hasRefreshError: true });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('hasRefreshError가 false이면 오류 메시지가 없다', () => {
    renderDashboard({ hasRefreshError: false });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('HomeDashboard 즐겨찾기', () => {
  test('즐겨찾기 추가 버튼이 렌더링된다', () => {
    renderDashboard();
    expect(
      screen.getByRole('button', { name: /즐겨찾기/ })
    ).toBeInTheDocument();
  });

  test('isFavorite이 true이면 버튼 레이블이 변경된다', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      isFavorite: () => true,
      toggleFavorite: vi.fn(),
      atMaxFavorites: false,
    });
    renderDashboard();
    expect(
      screen.getByRole('button', { name: /즐겨찾기 해제/ })
    ).toBeInTheDocument();
  });

  test('즐겨찾기가 최대 6개이면 버튼이 비활성화된다', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      isFavorite: () => false,
      toggleFavorite: vi.fn(),
      atMaxFavorites: true,
    });
    renderDashboard();
    expect(
      screen.getByRole('button', { name: /즐겨찾기 추가/ })
    ).toBeDisabled();
  });

  test('즐겨찾기 버튼 클릭 시 toggleFavorite이 호출된다', async () => {
    const user = userEvent.setup();
    const toggleFavorite = vi.fn();
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      isFavorite: () => false,
      toggleFavorite,
      atMaxFavorites: false,
    });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /즐겨찾기/ }));
    expect(toggleFavorite).toHaveBeenCalledWith(loc);
  });
});
