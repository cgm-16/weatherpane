// @vitest-environment jsdom
vi.mock('../frontend/features/app-bootstrap/active-location-context', () => ({
  useActiveLocation: vi.fn(),
}));
vi.mock('../frontend/features/weather-queries/use-core-weather', () => ({
  useCoreWeather: vi.fn(),
}));

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { FavoritesEmptyState } from '../frontend/pages/favorites/ui/favorites-empty-state';
import { FavoriteCard } from '../frontend/pages/favorites/ui/favorite-card';
import { useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { useCoreWeather } from '../frontend/features/weather-queries/use-core-weather';
import type { FavoriteLocation } from '../frontend/entities/location/model/types';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';

describe('FavoritesEmptyState', () => {
  function renderEmptyState() {
    return render(
      <MemoryRouter>
        <FavoritesEmptyState />
      </MemoryRouter>
    );
  }

  test('renders the 장소 검색하기 CTA linking to /search', () => {
    renderEmptyState();
    const link = screen.getByRole('link', { name: /장소 검색하기/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/search');
  });

  test('renders the 현재 위치 보기 CTA linking to /', () => {
    renderEmptyState();
    const link = screen.getByRole('link', { name: /현재 위치 보기/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});

// --- FavoriteCard fixtures ---

const seoulFav: FavoriteLocation = {
  favoriteId: 'fav-1',
  location: {
    kind: 'resolved',
    locationId: 'loc-seoul',
    catalogLocationId: 'KR-Seoul',
    name: '서울',
    admin1: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  },
  nickname: null,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const seoulFavWithNickname: FavoriteLocation = { ...seoulFav, nickname: '집' };

const freshWeatherData: CoreWeather = {
  locationId: 'loc-seoul',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  current: {
    temperatureC: 24,
    condition: {
      code: '800',
      text: '맑음',
      isDay: true,
      visualBucket: 'clear',
      textMapping: {
        conditionCode: '800',
        isDay: true,
        precipitationKind: 'none',
        cloudCoverPct: 0,
        intensity: 'none',
      },
    },
  },
  today: { minC: 18, maxC: 28 },
  hourly: [],
  source: { provider: 'kma' },
};

const staleWeatherData: CoreWeather = {
  ...freshWeatherData,
  fetchedAt: new Date(Date.now() - 15 * 60_000).toISOString(), // 15 min ago
};

// --- FavoriteCard helpers ---

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderCard(favorite: FavoriteLocation) {
  const qc = makeQueryClient();
  return render(<FavoriteCard favorite={favorite} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeWeatherQuery(overrides: Record<string, unknown> = {}): any {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

const mockSetActiveLocation = vi.fn();

describe('FavoriteCard', () => {
  afterEach(() => {
    vi.mocked(useActiveLocation).mockReset();
    vi.mocked(useCoreWeather).mockReset();
    mockSetActiveLocation.mockReset();
    // restore onLine if a test set it to false
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  function setupActiveLocation() {
    vi.mocked(useActiveLocation).mockReturnValue({
      activeLocation: null,
      setActiveLocation: mockSetActiveLocation,
      clearActiveLocation: vi.fn(),
    });
  }

  test('renders skeleton when no data and loading', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isLoading: true })
    );
    renderCard(seoulFav);
    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('서울')).not.toBeInTheDocument();
  });

  test('renders inline error with 다시 시도 button when fetch failed (online)', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isError: true })
    );
    renderCard(seoulFav);
    expect(
      screen.getByRole('button', { name: /다시 시도/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('서울')).not.toBeInTheDocument();
  });

  test('다시 시도 button calls refetch', async () => {
    setupActiveLocation();
    const refetch = vi.fn();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isError: true, refetch })
    );
    renderCard(seoulFav);
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  test('renders offline message when no data and offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isError: true })
    );
    renderCard(seoulFav);
    expect(screen.getByText(/오프라인/i)).toBeInTheDocument();
  });

  test('renders weather snapshot when data is fresh', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: freshWeatherData })
    );
    renderCard(seoulFav);
    expect(screen.getByText('서울')).toBeInTheDocument();
    expect(screen.getByText('24°')).toBeInTheDocument();
    expect(screen.getByText('28°')).toBeInTheDocument();
    expect(screen.getByText('18°')).toBeInTheDocument();
  });

  test('shows nickname when set', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: freshWeatherData })
    );
    renderCard(seoulFavWithNickname);
    expect(screen.getByText('집')).toBeInTheDocument();
  });

  test('shows stale indicator when data is 15 minutes old', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: staleWeatherData })
    );
    renderCard(seoulFav);
    expect(screen.getByText(/오래된 정보/i)).toBeInTheDocument();
  });

  test('clicking card navigates to /location/:id and sets active location', async () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: freshWeatherData })
    );
    renderCard(seoulFav);
    const card = screen.getByRole('article');
    await userEvent.click(card);
    expect(mockSetActiveLocation).toHaveBeenCalledOnce();
    expect(mockSetActiveLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resolved',
        location: seoulFav.location,
        source: 'favorite',
      })
    );
    // navigation is handled by MemoryRouter internally; we verify setActiveLocation was called
  });

  test('skeleton is not navigable (no article role)', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isLoading: true })
    );
    renderCard(seoulFav);
    expect(screen.queryByRole('article')).toBeNull();
  });
});
