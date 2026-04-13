// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { LocationUnsupported } from '../frontend/pages/location/ui/location-unsupported';
import { LocationNotFound } from '../frontend/pages/location/ui/location-not-found';
import { LocationConnectionError } from '../frontend/pages/location/ui/location-connection-error';
import { useDetailBootstrap } from '../frontend/features/app-bootstrap/use-detail-bootstrap';
import { useWeatherRefresh } from '../frontend/features/weather-queries/use-weather-refresh';
import { LocationPage } from '../frontend/pages/location/ui/location-page';
import {
  SketchManifestProvider,
  BASELINE_MANIFEST,
} from '../frontend/entities/asset';

vi.mock('../frontend/features/app-bootstrap/use-detail-bootstrap', () => ({
  useDetailBootstrap: vi.fn(),
}));
vi.mock('../frontend/features/weather-queries/use-weather-refresh', () => ({
  useWeatherRefresh: vi.fn(() => vi.fn()),
}));
vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    isFavorite: vi.fn(() => false),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    undoEntry: null,
    undoRemove: vi.fn(),
    atMaxFavorites: false,
    updateNickname: vi.fn(),
    reorderFavorites: vi.fn(),
  })),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('LocationUnsupported', () => {
  test('지원 불가 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /지원하지 않는 지역입니다/i })
    ).toBeInTheDocument();
  });

  test('검색으로 돌아가기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /검색으로 돌아가기/ })
    ).toHaveAttribute('href', '/search');
  });

  test('현재 위치로 돌아가기 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /현재 위치로 돌아가기/ })
    ).toHaveAttribute('href', '/');
  });

  test('홈으로 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute(
      'href',
      '/'
    );
  });
});

describe('LocationNotFound', () => {
  test('404 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /페이지를 찾을 수 없습니다/i })
    ).toBeInTheDocument();
  });

  test('홈으로 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute(
      'href',
      '/'
    );
  });

  test('검색하기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /검색하기/ })).toHaveAttribute(
      'href',
      '/search'
    );
  });
});

describe('LocationConnectionError', () => {
  test('오류 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /날씨 정보를 불러오지 못했습니다/i })
    ).toBeInTheDocument();
  });

  test('다시 시도 버튼 클릭 시 onRetry가 호출된다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={onRetry} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('검색하기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /검색하기/ })).toHaveAttribute(
      'href',
      '/search'
    );
  });

  test('현재 위치로 돌아가기 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /현재 위치로 돌아가기/ })
    ).toHaveAttribute('href', '/');
  });
});

const loc = {
  kind: 'resolved' as const,
  locationId: 'loc_KR-Seoul',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const locationPageCondition = {
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

function renderPage(resolvedLocationId = 'KR-Seoul') {
  return render(
    <SketchManifestProvider manifest={BASELINE_MANIFEST}>
      <MemoryRouter>
        <LocationPage resolvedLocationId={resolvedLocationId} />
      </MemoryRouter>
    </SketchManifestProvider>
  );
}

describe('LocationPage 상태별 렌더링', () => {
  test('unsupported → LocationUnsupported를 표시한다', () => {
    vi.mocked(useDetailBootstrap).mockReturnValue({
      kind: 'unsupported',
      catalogLocationId: 'KR-Busan',
    });
    renderPage('unsupported::KR-Busan');
    expect(
      screen.getByRole('link', { name: /검색으로 돌아가기/ })
    ).toBeInTheDocument();
  });

  test('not-found → LocationNotFound를 표시한다', () => {
    vi.mocked(useDetailBootstrap).mockReturnValue({ kind: 'not-found' });
    renderPage('invalid-id');
    expect(
      screen.getByRole('heading', { name: /페이지를 찾을 수 없습니다/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /홈으로/ })).toBeInTheDocument();
  });

  test('loading → 로딩 메시지를 표시한다', () => {
    vi.mocked(useDetailBootstrap).mockReturnValue({ kind: 'loading' });
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  test('recoverable-error → LocationConnectionError를 표시한다', () => {
    vi.mocked(useDetailBootstrap).mockReturnValue({
      kind: 'recoverable-error',
      location: loc,
    });
    renderPage();
    expect(
      screen.getByRole('button', { name: /다시 시도/ })
    ).toBeInTheDocument();
  });

  test('recoverable-error → 다시 시도 클릭 시 refresh를 location ID로 호출한다', async () => {
    const user = userEvent.setup();
    const mockRefresh = vi.fn();
    vi.mocked(useWeatherRefresh).mockReturnValue(mockRefresh);
    vi.mocked(useDetailBootstrap).mockReturnValue({
      kind: 'recoverable-error',
      location: loc,
    });
    renderPage();
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(mockRefresh).toHaveBeenCalledWith(loc.locationId);
  });

  test('stale-fallback → 오프라인 배너와 기온을 표시한다', () => {
    const now = new Date().toISOString();
    vi.mocked(useDetailBootstrap).mockReturnValue({
      kind: 'stale-fallback',
      location: loc,
      weather: {
        locationId: 'loc_KR-Seoul',
        fetchedAt: now,
        observedAt: now,
        temperatureC: 17,
        conditionCode: 'CLEAR',
        conditionText: '맑음',
        todayMinC: 10,
        todayMaxC: 22,
        source: { provider: 'mock' },
      },
      aqi: null,
    });
    renderPage();
    expect(screen.getByText(/오프라인 상태/)).toBeInTheDocument();
    expect(screen.getByText(/17/)).toBeInTheDocument();
  });

  test('data → DetailDashboard를 표시한다', () => {
    vi.mocked(useDetailBootstrap).mockReturnValue({
      kind: 'data',
      location: loc,
      isRefreshing: false,
      hasRefreshError: false,
      weather: {
        locationId: 'loc_KR-Seoul',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        current: { temperatureC: 18, condition: locationPageCondition },
        today: { minC: 10, maxC: 22 },
        hourly: [],
        source: { provider: 'mock' },
      },
      aqi: {
        locationId: 'loc_KR-Seoul',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        summary: { aqi: 2, category: 'fair' },
        pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
        source: { provider: 'mock' },
      },
    });
    renderPage();
    expect(screen.getByText(/18°/)).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();
  });
});
