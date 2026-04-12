// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

vi.mock('../frontend/features/app-bootstrap/use-home-bootstrap', () => ({
  useHomeBootstrap: vi.fn(),
}));
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return { ...real, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) };
});

import { useHomeBootstrap } from '../frontend/features/app-bootstrap/use-home-bootstrap';
import { HomePage } from '../frontend/pages/home/ui/home-page';

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

function renderPage() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe('HomePage 상태별 렌더링', () => {
  test('no-location → 지역 검색 링크를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({ kind: 'no-location' });
    renderPage();
    expect(screen.getByRole('link', { name: '지역 검색' })).toBeInTheDocument();
  });

  test('loading → 로딩 메시지를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({ kind: 'loading' });
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  test('config-error → Settings Update Needed 제목을 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'config-error',
      error: { code: 'INVALID_PROVIDER_MODE', field: 'VITE_WEATHER_PROVIDER_MODE', message: '값이 설정되지 않았습니다' },
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Settings Update Needed' })).toBeInTheDocument();
  });

  test('recoverable-error → Retry Connection 버튼을 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({ kind: 'recoverable-error', location: loc });
    renderPage();
    expect(screen.getByRole('button', { name: /Retry Connection/ })).toBeInTheDocument();
  });

  test('stale-fallback → 오프라인 표시와 기온을 표시한다', () => {
    const now = new Date().toISOString();
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'stale-fallback',
      location: loc,
      weather: {
        locationId: 'loc_test', fetchedAt: now, observedAt: now,
        temperatureC: 17, conditionCode: 'CLEAR', conditionText: '맑음',
        todayMinC: 10, todayMaxC: 22, source: { provider: 'mock' },
      },
      aqi: null,
    });
    renderPage();
    expect(screen.getByText(/오프라인 상태/)).toBeInTheDocument();
    expect(screen.getByText(/17/)).toBeInTheDocument();
  });

  test('data → 기온과 AQI 카테고리를 표시한다', () => {
    vi.mocked(useHomeBootstrap).mockReturnValue({
      kind: 'data',
      location: loc,
      weather: {
        locationId: 'loc_test',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        current: {
          temperatureC: 18,
          condition: {
            code: 'CLEAR', text: '맑음', isDay: true, visualBucket: 'clear',
            textMapping: { conditionCode: 'CLEAR', isDay: true, precipitationKind: 'none', cloudCoverPct: 5, intensity: 'none' },
          },
        },
        today: { minC: 10, maxC: 22 },
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
    expect(screen.getByText(/18/)).toBeInTheDocument();
    expect(screen.getByText(/fair/i)).toBeInTheDocument();
  });
});
