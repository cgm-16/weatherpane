// @vitest-environment jsdom
const mockNavigateFn = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) };
});
vi.mock('../frontend/features/app-bootstrap/active-location-context', () => ({
  useActiveLocation: vi.fn(),
}));
vi.mock('../frontend/features/weather-queries/use-core-weather', () => ({
  useCoreWeather: vi.fn(),
}));
vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(),
}));
vi.mock('../frontend/features/favorites/use-refresh-queue', () => ({
  useRefreshQueue: vi.fn(),
}));

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest';
import { FavoritesEmptyState } from '../frontend/pages/favorites/ui/favorites-empty-state';
import { FavoriteCard } from '../frontend/pages/favorites/ui/favorite-card';
import { FavoritesPage } from '../frontend/pages/favorites/ui/favorites-page';
import { useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { useCoreWeather } from '../frontend/features/weather-queries/use-core-weather';
import { useFavorites } from '../frontend/features/favorites/use-favorites';
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

const veryStaleWeatherData: CoreWeather = {
  ...freshWeatherData,
  fetchedAt: new Date(Date.now() - 70 * 60_000).toISOString(), // 70 min ago
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
  beforeEach(() => {
    mockNavigateFn.mockClear();
  });

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
    expect(
      screen.queryByRole('button', { name: /다시 시도/i })
    ).not.toBeInTheDocument();
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
    expect(screen.queryByText(/오래된 정보/i)).not.toBeInTheDocument();
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
    expect(screen.getByText('오래된 정보')).toBeInTheDocument();
  });

  test('shows very stale indicator when data is 70 minutes old', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: veryStaleWeatherData })
    );
    renderCard(seoulFav);
    expect(screen.getByText('매우 오래된 정보')).toBeInTheDocument();
  });

  test('shows snapshot and stale indicator when refresh failed but snapshot exists', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({
        data: freshWeatherData,
        isLoading: false,
        isError: true,
      })
    );
    renderCard(seoulFav);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();
    expect(screen.getByText('24°')).toBeInTheDocument();
    expect(screen.getByText('오래된 정보')).toBeInTheDocument();
  });

  test('shows snapshot when offline but cached data is available', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: freshWeatherData })
    );
    renderCard(seoulFav);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();
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
    expect(mockNavigateFn).toHaveBeenCalledWith('/location/loc-seoul');
  });

  test('skeleton is not navigable (no article role)', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isLoading: true })
    );
    renderCard(seoulFav);
    expect(screen.queryByRole('article')).toBeNull();
  });

  describe('staleness thresholds', () => {
    // Freeze time so boundary calculations are exact and deterministic.
    // getStaleness uses strict > comparison: age must exceed the threshold to cross it.
    const FROZEN_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FROZEN_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // exactly 10 minutes old: ageMs === STALE_MS, not > STALE_MS → fresh (no indicator)
    test('no stale indicator at exactly 10 minutes', () => {
      setupActiveLocation();
      vi.mocked(useCoreWeather).mockReturnValue({
        data: {
          ...freshWeatherData,
          fetchedAt: new Date(FROZEN_NOW - 10 * 60_000).toISOString(),
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      renderCard(seoulFav);
      expect(screen.queryByText(/오래된 정보/i)).not.toBeInTheDocument();
    });

    // exactly 60 minutes old: ageMs === VERY_STALE_MS, not > VERY_STALE_MS → stale, not very-stale
    test('shows stale (not very stale) indicator at exactly 60 minutes', () => {
      setupActiveLocation();
      vi.mocked(useCoreWeather).mockReturnValue({
        data: {
          ...freshWeatherData,
          fetchedAt: new Date(FROZEN_NOW - 60 * 60_000).toISOString(),
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      renderCard(seoulFav);
      expect(screen.getByText('오래된 정보')).toBeInTheDocument();
      expect(screen.queryByText('매우 오래된 정보')).not.toBeInTheDocument();
    });

    // 9 minutes 59 seconds old: just under stale threshold → fresh
    test('no stale indicator at 9 minutes 59 seconds', () => {
      setupActiveLocation();
      vi.mocked(useCoreWeather).mockReturnValue({
        data: {
          ...freshWeatherData,
          fetchedAt: new Date(FROZEN_NOW - (10 * 60_000 - 1)).toISOString(),
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      renderCard(seoulFav);
      expect(screen.queryByText(/오래된 정보/i)).not.toBeInTheDocument();
    });
  });
});

describe('FavoritesPage', () => {
  const mockSetActiveLocationPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigateFn);
    vi.mocked(useActiveLocation).mockReturnValue({
      activeLocation: null,
      setActiveLocation: mockSetActiveLocationPage,
      clearActiveLocation: vi.fn(),
    });
    vi.mocked(useCoreWeather).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter>
          <FavoritesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  test('renders empty state when favorites list is empty', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      undoEntry: null,
      undoRemove: vi.fn(),
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
    });
    renderPage();
    expect(
      screen.getByRole('link', { name: /장소 검색하기/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /현재 위치 보기/i })
    ).toBeInTheDocument();
  });

  test('renders a card skeleton for each favorite while weather is loading', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [
        seoulFav,
        {
          ...seoulFav,
          favoriteId: 'fav-2',
          location: {
            ...seoulFav.location,
            locationId: 'loc-busan',
            name: '부산',
          },
        },
      ],
      undoEntry: null,
      undoRemove: vi.fn(),
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
    });
    renderPage();
    expect(screen.getAllByTestId('card-skeleton')).toHaveLength(2);
  });

  test('renders undo toast when undoEntry is present', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      undoEntry: { snapshot: [seoulFav], removedItem: seoulFav },
      undoRemove: vi.fn(),
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
    });
    renderPage();
    expect(
      screen.getByRole('button', { name: /실행 취소/i })
    ).toBeInTheDocument();
  });

  test('undo toast shows the removed location name', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      undoEntry: { snapshot: [seoulFav], removedItem: seoulFav },
      undoRemove: vi.fn(),
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
    });
    renderPage();
    expect(screen.getByText(/서울/)).toBeInTheDocument();
  });
});
