// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useParams } from 'react-router';
import { vi, afterEach, describe, expect, test } from 'vitest';

import SearchRoute from '../app/routes/search';
import {
  storageKeys,
  storageSchemaVersion,
} from '../frontend/shared/lib/storage/storage-keys';
import type { RecentLocation } from '../frontend/entities/location/model/types';
import { createMemoryStorage } from './storage/test-storage';
import { ActiveLocationProvider } from '../frontend/features/app-bootstrap/active-location-context';
import { useWeatherProvider } from '../frontend/shared/api/weather-provider';

vi.mock('../frontend/shared/api/weather-provider', async (importActual) => {
  const actual =
    await importActual<
      typeof import('../frontend/shared/api/weather-provider')
    >();
  return {
    ...actual,
    useWeatherProvider: vi.fn(),
  };
});

afterEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

function seedRecents(recents: RecentLocation[]): void {
  localStorage.setItem(
    storageKeys.recents,
    JSON.stringify({ version: storageSchemaVersion, data: recents })
  );
}

function makeRecentLocation(
  catalogLocationId: string,
  name: string,
  admin1: string,
  admin2?: string
): RecentLocation {
  return {
    location: {
      kind: 'resolved',
      locationId: `loc_${catalogLocationId}`,
      catalogLocationId,
      name,
      admin1,
      ...(admin2 ? { admin2 } : {}),
      latitude: 37.5,
      longitude: 127.0,
      timezone: 'Asia/Seoul',
    },
    lastOpenedAt: new Date().toISOString(),
  };
}

function LocationStub() {
  const { resolvedLocationId } = useParams();

  return <p>선택된 위치: {resolvedLocationId}</p>;
}

function renderSearchRoute(initialEntry = '/search') {
  vi.mocked(useWeatherProvider).mockReturnValue({
    mode: 'mock',
    getCoreWeather: vi.fn(),
    getAqi: vi.fn(),
    geocode: vi.fn().mockResolvedValue([
      {
        name: '명동',
        admin1: '서울특별시',
        admin2: '중구',
        countryCode: 'KR',
        latitude: 37.5635,
        longitude: 126.9819,
        timezone: 'Asia/Seoul',
      },
    ]),
  });

  const storage = createMemoryStorage();
  const router = createMemoryRouter(
    [
      {
        path: '/search',
        element: <SearchRoute />,
      },
      {
        path: '/location/:resolvedLocationId',
        element: <LocationStub />,
      },
    ],
    {
      initialEntries: [initialEntry],
    }
  );

  render(
    <ActiveLocationProvider storage={storage}>
      <RouterProvider router={router} />
    </ActiveLocationProvider>
  );

  return {
    router,
    user: userEvent.setup(),
  };
}

function renderSearchRouteWithStorage(
  initialEntry = '/search',
  storage = createMemoryStorage()
) {
  const router = createMemoryRouter(
    [
      { path: '/search', element: <SearchRoute /> },
      { path: '/location/:resolvedLocationId', element: <LocationStub /> },
    ],
    { initialEntries: [initialEntry] }
  );

  render(
    <ActiveLocationProvider storage={storage}>
      <RouterProvider router={router} />
    </ActiveLocationProvider>
  );

  return { router, storage, user: userEvent.setup() };
}

describe('search route', () => {
  test('hydrates the input and results from q on direct open', async () => {
    renderSearchRoute('/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99');

    expect(
      await screen.findByRole('searchbox', { name: '지역 검색' })
    ).toHaveValue('청운동');
    expect(
      await screen.findByRole('listbox', { name: '검색 결과' })
    ).toBeVisible();
    expect(
      await screen.findByRole('option', { name: /서울특별시-종로구-청운동/i })
    ).toBeVisible();
  });

  test('replaces history while typing and removes q when the input is cleared', async () => {
    const { router, user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await user.type(input, '종로');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');
    });
    expect(router.state.historyAction).toBe('REPLACE');

    await user.clear(input);

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  test('shows only search results during an active query', async () => {
    const { user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    expect(screen.getByRole('heading', { name: '인기 지역' })).toBeVisible();

    await user.type(input, '종로');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '인기 지역' })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('listbox', { name: '검색 결과' })).toBeVisible();
  });

  test('caps the initial result viewport at 8 rows before scrolling', async () => {
    renderSearchRoute('/search?q=%EC%A2%85%EB%A1%9C');

    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(8);
    expect(listbox).toHaveAttribute('data-visible-result-limit', '8');
  });

  test('shows the empty-state copy only for a true no-match query', async () => {
    const { user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await user.type(input, '없는지역이름');

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: '인기 지역' })
    ).not.toBeInTheDocument();
  });

  test('auto-highlights the first result, supports arrow navigation, and pushes stub navigation on Enter', async () => {
    const { router, user } = renderSearchRoute('/search?q=%EB%AA%85%EB%8F%99');
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });
    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    await waitFor(() => {
      expect(
        within(listbox).getAllByRole('option').length
      ).toBeGreaterThanOrEqual(2);
    });

    const options = within(listbox).getAllByRole('option');

    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(
        /^\/location\/[0-9a-f]{12}$/
      );
    });
    expect(router.state.historyAction).toBe('PUSH');
    expect(
      await screen.findByText(
        `선택된 위치: ${router.state.location.pathname.replace('/location/', '')}`
      )
    ).toBeVisible();
  });

  test('does not navigate on Enter when IME composition is active', async () => {
    const { router } = renderSearchRoute('/search?q=%EB%AA%85%EB%8F%99');
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await screen.findByRole('listbox', { name: '검색 결과' });

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    // IME composition Enter must not trigger navigation
    expect(router.state.location.pathname).toBe('/search');
  });

  test('clears the auto-highlight on the first Esc, then clears the query on the next Esc', async () => {
    const { router, user } = renderSearchRoute(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });
    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    const options = within(listbox).getAllByRole('option');

    await user.click(input);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Escape}');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveValue('청운동');
    expect(input).not.toHaveAttribute('aria-activedescendant');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(input).toHaveValue('');
  });
});

describe('search result selection', () => {
  test('성공한 선택은 detail로 이동하고 active location을 업데이트한다', async () => {
    vi.mocked(useWeatherProvider).mockReturnValue({
      mode: 'mock',
      getCoreWeather: vi.fn(),
      getAqi: vi.fn(),
      geocode: vi.fn().mockResolvedValue([
        {
          name: '청운동',
          admin1: '서울특별시',
          admin2: '종로구',
          countryCode: 'KR',
          latitude: 37.5729,
          longitude: 126.9794,
          timezone: 'Asia/Seoul',
        },
      ]),
    });

    const storage = createMemoryStorage();
    const { router, user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99',
      storage
    );

    const option = await screen.findByRole('option', {
      name: /서울특별시-종로구-청운동/i,
    });

    await user.click(option);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(
        /^\/location\/[0-9a-f]{12}$/
      );
    });
    expect(router.state.historyAction).toBe('PUSH');

    const stored = storage.getItem(storageKeys.activeLocation);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.data.kind).toBe('resolved');
    expect(parsed.data.source).toBe('search');
  });

  test('비지원 선택은 unsupported 라우트로 이동하고 active location을 변경하지 않는다', async () => {
    vi.mocked(useWeatherProvider).mockReturnValue({
      mode: 'mock',
      getCoreWeather: vi.fn(),
      getAqi: vi.fn(),
      geocode: vi.fn().mockResolvedValue([]),
    });

    const storage = createMemoryStorage();
    const { router, user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99',
      storage
    );

    const option = await screen.findByRole('option', {
      name: /서울특별시-종로구-청운동/i,
    });

    await user.click(option);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(
        /^\/location\/unsupported::/
      );
    });

    expect(storage.getItem(storageKeys.activeLocation)).toBeNull();
  });

  test('geocode 오류 시 이동하지 않고 오류 메시지를 표시한다', async () => {
    vi.mocked(useWeatherProvider).mockReturnValue({
      mode: 'mock',
      getCoreWeather: vi.fn(),
      getAqi: vi.fn(),
      geocode: vi.fn().mockRejectedValue(new Error('네트워크 오류')),
    });

    const { router, user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );

    const option = await screen.findByRole('option', {
      name: /서울특별시-종로구-청운동/i,
    });

    await user.click(option);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeVisible();
    });
    expect(router.state.location.pathname).toBe('/search');
  });

  test('오류 후 재시도 버튼을 클릭하면 선택을 다시 시도한다', async () => {
    const geocode = vi
      .fn()
      .mockRejectedValueOnce(new Error('일시적 오류'))
      .mockResolvedValue([
        {
          name: '청운동',
          admin1: '서울특별시',
          admin2: '종로구',
          countryCode: 'KR',
          latitude: 37.5729,
          longitude: 126.9794,
          timezone: 'Asia/Seoul',
        },
      ]);

    vi.mocked(useWeatherProvider).mockReturnValue({
      mode: 'mock',
      getCoreWeather: vi.fn(),
      getAqi: vi.fn(),
      geocode,
    });

    const { router, user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );

    const option = await screen.findByRole('option', {
      name: /서울특별시-종로구-청운동/i,
    });

    await user.click(option);

    const retryButton = await screen.findByRole('button', {
      name: /다시 시도/,
    });
    await user.click(retryButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(
        /^\/location\/[0-9a-f]{12}$/
      );
    });
  });

  test('선택 진행 중에는 listbox가 aria-busy=true가 된다', async () => {
    let resolveGeocode!: (value: unknown[]) => void;
    vi.mocked(useWeatherProvider).mockReturnValue({
      mode: 'mock',
      getCoreWeather: vi.fn(),
      getAqi: vi.fn(),
      geocode: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveGeocode = resolve;
        })
      ),
    });

    const { user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );

    const option = await screen.findByRole('option', {
      name: /서울특별시-종로구-청운동/i,
    });

    await user.click(option);

    const listbox = screen.getByRole('listbox', { name: '검색 결과' });
    await waitFor(() => {
      expect(listbox).toHaveAttribute('aria-busy', 'true');
    });

    resolveGeocode([]);
  });
});

describe('search default state — recents and popular', () => {
  test('shows only 인기 지역 when recents are empty', async () => {
    renderSearchRoute();

    expect(
      await screen.findByRole('heading', { name: '인기 지역' })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: '최근 지역' })
    ).not.toBeInTheDocument();
  });

  test('shows 최근 지역 above 인기 지역 when recents exist', async () => {
    seedRecents([makeRecentLocation('5f5def784f91', '청운동', '서울특별시')]);
    renderSearchRoute();

    const recentsHeading = await screen.findByRole('heading', {
      name: '최근 지역',
    });
    const popularHeading = screen.getByRole('heading', { name: '인기 지역' });

    expect(recentsHeading).toBeVisible();
    expect(popularHeading).toBeVisible();
    expect(
      recentsHeading.compareDocumentPosition(popularHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('shows each recent location by name in the recents section', async () => {
    seedRecents([
      makeRecentLocation('5f5def784f91', '청운동', '서울특별시'),
      makeRecentLocation('aabbccddeeff', '역삼동', '서울특별시', '강남구'),
    ]);
    renderSearchRoute();

    // 최근 지역 섹션 내 버튼으로 검증하여 인기 지역의 동명 항목과 구분
    const recentsSection = await screen.findByRole('heading', {
      name: '최근 지역',
    });
    const sectionEl = recentsSection.closest('section')!;
    expect(within(sectionEl).getByText('청운동')).toBeVisible();
    expect(within(sectionEl).getByText('역삼동')).toBeVisible();
  });

  test('hides both 최근 지역 and 인기 지역 when query is active', async () => {
    seedRecents([makeRecentLocation('5f5def784f91', '청운동', '서울특별시')]);
    const { user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await user.type(input, '종로');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '최근 지역' })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: '인기 지역' })
    ).not.toBeInTheDocument();
  });

  test('clicking a recent location navigates to its detail route', async () => {
    seedRecents([makeRecentLocation('5f5def784f91', '청운동', '서울특별시')]);
    const { router } = renderSearchRoute();

    const btn = await screen.findByRole('button', { name: /청운동/ });
    await userEvent.setup().click(btn);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/location/5f5def784f91');
    });
    expect(router.state.historyAction).toBe('PUSH');
  });
});
