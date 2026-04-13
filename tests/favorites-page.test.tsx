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

// --- FavoriteCard 픽스처 ---

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
  fetchedAt: new Date(Date.now() - 15 * 60_000).toISOString(), // 15분 전
};

const veryStaleWeatherData: CoreWeather = {
  ...freshWeatherData,
  fetchedAt: new Date(Date.now() - 70 * 60_000).toISOString(), // 70분 전
};

// --- FavoriteCard 헬퍼 ---

function makeTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderCard(favorite: FavoriteLocation) {
  const qc = makeTestQueryClient();
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
    expect(
      screen.getByRole('button', { name: '서울 날씨 보기' })
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole('button', { name: '서울 날씨 보기' })
    ).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();
  });

  test('clicking card navigates to /location/:id and sets active location', async () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ data: freshWeatherData })
    );
    renderCard(seoulFav);
    const card = screen.getByRole('button', { name: '서울 날씨 보기' });
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

  test('skeleton is not navigable (button role absent)', () => {
    setupActiveLocation();
    vi.mocked(useCoreWeather).mockReturnValue(
      makeWeatherQuery({ isLoading: true })
    );
    renderCard(seoulFav);
    expect(screen.queryByRole('button', { name: /날씨 보기/ })).toBeNull();
  });

  describe('staleness thresholds', () => {
    // 경계 계산이 정확하고 결정적이도록 시간을 고정한다.
    // getStaleness는 엄격한 > 비교를 사용한다: 임계값을 초과해야 경계를 넘는다.
    const FROZEN_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FROZEN_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // 정확히 10분 지남: ageMs === STALE_MS, > STALE_MS 아님 → 신선 (표시 없음)
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

    // 정확히 60분 지남: ageMs === VERY_STALE_MS, > VERY_STALE_MS 아님 → 오래됨, 매우 오래됨 아님
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

    // 9분 59초 지남: 오래됨 임계값 바로 아래 → 신선
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
      <QueryClientProvider client={makeTestQueryClient()}>
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
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
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
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
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
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
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
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/서울/)).toBeInTheDocument();
  });

  test('undo toast shows nickname when removedItem has a nickname', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      undoEntry: {
        snapshot: [seoulFavWithNickname],
        removedItem: seoulFavWithNickname,
      },
      undoRemove: vi.fn(),
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/집/)).toBeInTheDocument();
    // 닉네임 대신 장소 이름이 토스트에 나타나면 안 된다
    // ('서울' 이름은 다른 맥락에서 나타날 수 있으므로 닉네임 존재만 확인으로 충분하다)
  });

  test('clicking undo button calls undoRemove', async () => {
    const user = userEvent.setup();
    const mockUndoRemove = vi.fn();
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      undoEntry: { snapshot: [seoulFav], removedItem: seoulFav },
      undoRemove: mockUndoRemove,
      isFavorite: vi.fn(),
      addFavorite: vi.fn(),
      removeFavorite: vi.fn(),
      atMaxFavorites: false,
      updateNickname: vi.fn(),
      reorderFavorites: vi.fn(),
    });
    renderPage();
    await user.click(screen.getByRole('button', { name: /실행 취소/i }));
    expect(mockUndoRemove).toHaveBeenCalledOnce();
  });
});
