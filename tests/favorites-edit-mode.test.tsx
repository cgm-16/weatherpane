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
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { FavoritesPage } from '../frontend/pages/favorites/ui/favorites-page';
import { useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { useCoreWeather } from '../frontend/features/weather-queries/use-core-weather';
import { useFavorites } from '../frontend/features/favorites/use-favorites';
import type { FavoriteLocation } from '../frontend/entities/location/model/types';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';

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

const busanFav: FavoriteLocation = {
  favoriteId: 'fav-2',
  location: {
    kind: 'resolved',
    locationId: 'loc-busan',
    catalogLocationId: 'KR-Busan',
    name: '부산',
    admin1: '부산광역시',
    latitude: 35.1796,
    longitude: 129.0756,
    timezone: 'Asia/Seoul',
  },
  nickname: null,
  order: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const freshWeather: CoreWeather = {
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

function makeTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const mockUpdateNickname = vi.fn();
const mockReorderFavorites = vi.fn();

function setupFavorites(favs: FavoriteLocation[] = [seoulFav, busanFav]) {
  vi.mocked(useFavorites).mockReturnValue({
    favorites: favs,
    undoEntry: null,
    undoRemove: vi.fn(),
    isFavorite: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    updateNickname: mockUpdateNickname,
    reorderFavorites: mockReorderFavorites,
    atMaxFavorites: false,
  });
}

function setupWeather() {
  vi.mocked(useCoreWeather).mockReturnValue({
    data: freshWeather,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  vi.mocked(useActiveLocation).mockReturnValue({
    activeLocation: null,
    setActiveLocation: vi.fn(),
    clearActiveLocation: vi.fn(),
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeTestQueryClient()}>
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // setupWeather은 모든 테스트에서 동일하므로 여기서 호출한다.
  // setupFavorites는 테스트마다 즐겨찾기 목록이 다르므로 각 테스트에서 직접 호출한다.
  setupWeather();
});

describe('FavoritesPage — 편집/완료 toggle', () => {
  test('편집 button is present when favorites exist', () => {
    setupFavorites();
    renderPage();
    expect(screen.getByRole('button', { name: /편집/i })).toBeInTheDocument();
  });

  test('clicking 편집 switches button label to 완료', async () => {
    setupFavorites();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    expect(screen.getByRole('button', { name: /완료/i })).toBeInTheDocument();
  });

  test('clicking 완료 switches button label back to 편집', async () => {
    setupFavorites();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    await userEvent.click(screen.getByRole('button', { name: /완료/i }));
    expect(screen.getByRole('button', { name: /편집/i })).toBeInTheDocument();
  });

  test('up/down buttons not visible in read mode', () => {
    setupFavorites();
    renderPage();
    expect(
      screen.queryByRole('button', { name: /위로 이동/i })
    ).not.toBeInTheDocument();
  });

  test('up/down buttons visible in edit mode', async () => {
    setupFavorites();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    expect(
      screen.getAllByRole('button', { name: /위로 이동/i }).length
    ).toBeGreaterThan(0);
  });
});

describe('FavoritesPage — nickname input in edit mode', () => {
  test('nickname input is visible for each card in edit mode', async () => {
    setupFavorites();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  test('nickname input has maxLength 20', async () => {
    setupFavorites();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '20');
  });

  test('nickname input is pre-filled with existing nickname', async () => {
    const withNick = { ...seoulFav, nickname: '집' };
    setupFavorites([withNick]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    expect(input).toHaveValue('집');
  });

  test('committing nickname calls updateNickname with trimmed value on blur', async () => {
    setupFavorites([seoulFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '  홈  ');
    await userEvent.tab();
    expect(mockUpdateNickname).toHaveBeenCalledWith(seoulFav.favoriteId, '홈');
  });

  test('committing empty nickname calls updateNickname with null', async () => {
    setupFavorites([seoulFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(mockUpdateNickname).toHaveBeenCalledWith(seoulFav.favoriteId, null);
  });

  test('pressing Enter commits nickname', async () => {
    setupFavorites([seoulFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    await userEvent.type(input, '오피스{Enter}');
    expect(mockUpdateNickname).toHaveBeenCalledWith(
      seoulFav.favoriteId,
      '오피스'
    );
  });

  test('pressing Escape discards changes', async () => {
    setupFavorites([seoulFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    await userEvent.type(input, '버려질값');
    await userEvent.keyboard('{Escape}');
    const calls = mockUpdateNickname.mock.calls;
    expect(calls.every(([, val]) => val !== '버려질값')).toBe(true);
  });

  test('clicking 완료 commits active nickname and exits mode', async () => {
    setupFavorites([seoulFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    const [input] = screen.getAllByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, '홈');
    await userEvent.click(screen.getByRole('button', { name: /완료/i }));
    expect(mockUpdateNickname).toHaveBeenCalledWith(seoulFav.favoriteId, '홈');
    expect(screen.getByRole('button', { name: /편집/i })).toBeInTheDocument();
  });
});

describe('FavoritesPage — up/down reorder buttons', () => {
  test('first card has no 위로 button', async () => {
    setupFavorites([seoulFav, busanFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    expect(
      screen.queryByRole('button', { name: '즐겨찾기 서울 위로 이동' })
    ).not.toBeInTheDocument();
  });

  test('last card has no 아래로 button', async () => {
    setupFavorites([seoulFav, busanFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    expect(
      screen.queryByRole('button', { name: '즐겨찾기 부산 아래로 이동' })
    ).not.toBeInTheDocument();
  });

  test('clicking 위로 on second card defers reorder until 완료', async () => {
    setupFavorites([seoulFav, busanFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    await userEvent.click(
      screen.getByRole('button', { name: '즐겨찾기 부산 위로 이동' })
    );
    // 버튼 클릭 시 즉시 저장 안 됨 — draft에만 반영
    expect(mockReorderFavorites).not.toHaveBeenCalled();
    // draft 순서가 DOM에 반영되어 부산이 첫 번째(위로 버튼 없음)
    expect(
      screen.queryByRole('button', { name: '즐겨찾기 부산 위로 이동' })
    ).not.toBeInTheDocument();
    // "완료" 클릭 시 바뀐 순서로 한 번만 저장
    await userEvent.click(screen.getByRole('button', { name: /완료/i }));
    expect(mockReorderFavorites).toHaveBeenCalledOnce();
    const [reordered] = mockReorderFavorites.mock.calls[0];
    expect(reordered[0].favoriteId).toBe(busanFav.favoriteId);
    expect(reordered[1].favoriteId).toBe(seoulFav.favoriteId);
  });

  test('clicking 아래로 on first card defers reorder until 완료', async () => {
    setupFavorites([seoulFav, busanFav]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /편집/i }));
    await userEvent.click(
      screen.getByRole('button', { name: '즐겨찾기 서울 아래로 이동' })
    );
    // 버튼 클릭 시 즉시 저장 안 됨 — draft에만 반영
    expect(mockReorderFavorites).not.toHaveBeenCalled();
    // draft 순서가 DOM에 반영되어 서울이 마지막(아래로 버튼 없음)
    expect(
      screen.queryByRole('button', { name: '즐겨찾기 서울 아래로 이동' })
    ).not.toBeInTheDocument();
    // "완료" 클릭 시 바뀐 순서로 한 번만 저장
    await userEvent.click(screen.getByRole('button', { name: /완료/i }));
    expect(mockReorderFavorites).toHaveBeenCalledOnce();
    const [reordered] = mockReorderFavorites.mock.calls[0];
    expect(reordered[0].favoriteId).toBe(busanFav.favoriteId);
    expect(reordered[1].favoriteId).toBe(seoulFav.favoriteId);
  });
});
