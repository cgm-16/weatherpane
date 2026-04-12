// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { DetailAqiCard } from '../frontend/pages/location/ui/detail-aqi-card';
import { DetailUvCard } from '../frontend/pages/location/ui/detail-uv-card';
import { DetailDashboard } from '../frontend/pages/location/ui/detail-dashboard';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';

vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    isFavorite: vi.fn(() => false),
    toggleFavorite: vi.fn(),
    atMaxFavorites: false,
  })),
}));

const aqi: Aqi = {
  locationId: 'loc_test',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock' },
};

describe('DetailAqiCard', () => {
  test('AQI 값과 카테고리를 표시한다', () => {
    render(<DetailAqiCard aqi={aqi} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  test('상세 보기 버튼 클릭 시 오염물질 드로어가 열린다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    expect(
      screen.getByRole('dialog', { name: /대기질 상세/ })
    ).toBeInTheDocument();
  });

  test('드로어에서 PM10, PM2.5 값을 표시한다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    expect(screen.getByText(/PM10/)).toBeInTheDocument();
    expect(screen.getByText(/PM2\.5/)).toBeInTheDocument();
  });

  test('드로어 닫기 버튼 클릭 시 드로어가 닫힌다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    await user.click(screen.getByRole('button', { name: /닫기/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DetailUvCard', () => {
  test('UV 지수가 있으면 값을 표시한다', () => {
    render(<DetailUvCard uvIndex={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  test('UV 지수가 없으면 "—"을 표시한다', () => {
    render(<DetailUvCard uvIndex={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('상세 보기 버튼 클릭 시 UV 드로어가 열린다', async () => {
    const user = userEvent.setup();
    render(<DetailUvCard uvIndex={8} />);
    await user.click(
      screen.getByRole('button', { name: /자외선 지수 상세 보기/ })
    );
    expect(
      screen.getByRole('dialog', { name: /자외선 지수 상세/ })
    ).toBeInTheDocument();
  });

  test('드로어 닫기 버튼 클릭 시 드로어가 닫힌다', async () => {
    const user = userEvent.setup();
    render(<DetailUvCard uvIndex={8} />);
    await user.click(
      screen.getByRole('button', { name: /자외선 지수 상세 보기/ })
    );
    await user.click(screen.getByRole('button', { name: /닫기/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('UV 지수가 없으면 상세 보기 버튼이 없다', () => {
    render(<DetailUvCard uvIndex={undefined} />);
    expect(
      screen.queryByRole('button', { name: /상세 보기/ })
    ).not.toBeInTheDocument();
  });
});

const loc: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_KR-Seoul',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const dashboardCondition = {
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

const dashboardWeather: CoreWeather = {
  locationId: 'loc_KR-Seoul',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  current: {
    temperatureC: 18,
    humidityPct: 56,
    uvIndex: 5,
    dewPointC: 9,
    condition: dashboardCondition,
  },
  today: { minC: 10, maxC: 22 },
  hourly: [],
  source: { provider: 'mock' },
};

// aqi는 파일 상단에 정의되어 있으므로 여기서는 재사용한다
function renderDashboard(
  overrides: Partial<Parameters<typeof DetailDashboard>[0]> = {}
) {
  return render(
    <MemoryRouter>
      <DetailDashboard
        location={loc}
        weather={dashboardWeather}
        aqi={aqi}
        isRefreshing={false}
        hasRefreshError={false}
        onRefresh={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>
  );
}

describe('DetailDashboard 콘텐츠 렌더링', () => {
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

  test('습도를 표시한다', () => {
    renderDashboard();
    expect(screen.getByText(/56%/)).toBeInTheDocument();
  });

  test('이슬점을 표시한다', () => {
    renderDashboard();
    expect(screen.getByText(/9°/)).toBeInTheDocument();
  });

  test('위치 이름을 표시한다', () => {
    renderDashboard();
    expect(screen.getByText('서울')).toBeInTheDocument();
  });

  test('홈으로 돌아가기 링크가 /로 연결된다', () => {
    renderDashboard();
    expect(
      screen.getByRole('link', { name: /홈으로 돌아가기/ })
    ).toHaveAttribute('href', '/');
  });

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

  test('dewPointC가 없으면 "—"을 표시한다', () => {
    const weatherNoDew: CoreWeather = {
      ...dashboardWeather,
      current: { temperatureC: 18, condition: dashboardCondition },
    };
    renderDashboard({ weather: weatherNoDew });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('hourly 데이터가 있으면 시간별 예보 섹션이 표시된다', () => {
    const makeHourlyEntry = (utcHour: number) => {
      const at = new Date('2025-01-01T00:00:00.000Z');
      at.setUTCHours(utcHour, 0, 0, 0);
      return {
        at: at.toISOString(),
        temperatureC: 20,
        popPct: 0,
        condition: dashboardCondition,
      };
    };
    const hourlyWeather: CoreWeather = {
      ...dashboardWeather,
      hourly: Array.from({ length: 6 }, (_, i) => makeHourlyEntry(i)),
    };
    renderDashboard({ weather: hourlyWeather });
    expect(
      screen.getByRole('region', { name: /시간별 예보/ })
    ).toBeInTheDocument();
  });
});
