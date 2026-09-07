// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { flushSync } from 'react-dom';
import {
  RouterProvider,
  createMemoryRouter,
  useLocation,
  useParams,
} from 'react-router';
import { vi, afterEach, describe, expect, test } from 'vitest';

import SearchRoute from '../app/routes/search';
import {
  storageKeys,
  storageSchemaVersion,
} from '../frontend/shared/lib/storage/storage-keys';
import * as searchSelection from '../frontend/entities/location/search-selection';
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

function SuspendExternalQuery({ pending }: { pending: Promise<void> }) {
  const location = useLocation();
  if (location.search === '?q=external') throw pending;
  return null;
}

function renderSearchRoute(
  initialEntry = '/search',
  searchElement = <SearchRoute />
) {
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
        element: searchElement,
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
      <Suspense fallback={<p>대기 중</p>}>
        <RouterProvider router={router} />
      </Suspense>
    </ActiveLocationProvider>
  );

  return {
    router,
    storage,
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
        /^\/location\/loc_[0-9a-f]{12}$/
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

  test('타이핑 시 입력 박스는 즉시 업데이트되고 URL은 300ms 디바운스 후 업데이트됨', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;

      fireEvent.change(input, { target: { value: '서울' } });

      // 입력 박스는 즉시 업데이트됨
      expect(input.value).toBe('서울');
      // 디바운스 전에는 URL이 변경되지 않아야 함
      expect(router.state.location.search).toBe('');

      vi.advanceTimersByTime(300);

      // 디바운스 후 URL이 업데이트됨
      expect(router.state.location.search).toBe('?q=%EC%84%9C%EC%9A%B8');
    } finally {
      vi.useRealTimers();
    }
  });

  test('연속 타이핑 시 마지막 값만 URL에 반영됨 (디바운스 중복 방지)', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;

      fireEvent.change(input, { target: { value: '서' } });
      vi.advanceTimersByTime(100);
      fireEvent.change(input, { target: { value: '서울' } });
      vi.advanceTimersByTime(300);

      expect(router.state.location.search).toBe('?q=%EC%84%9C%EC%9A%B8');
    } finally {
      vi.useRealTimers();
    }
  });

  test('자체 URL acknowledgement가 새 local input을 덮어쓰지 않는다', () => {
    vi.useFakeTimers();
    let unsubscribe: (() => void) | undefined;

    try {
      const { router } = renderSearchRoute('/search');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;
      let clearedAfterInternalNavigation = false;

      unsubscribe = router.subscribe((state) => {
        if (
          !clearedAfterInternalNavigation &&
          state.location.search === '?q=%EC%A2%85%EB%A1%9C'
        ) {
          clearedAfterInternalNavigation = true;
          fireEvent.change(input, { target: { value: '' } });
        }
      });

      fireEvent.change(input, { target: { value: '종로' } });

      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');

      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('');
      expect(router.state.location.search).toBe('');
    } finally {
      unsubscribe?.();
      vi.useRealTimers();
    }
  });

  test('자체 URL 전환의 긴급 렌더 뒤 입력도 URL에 반영한다', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;

      fireEvent.change(input, { target: { value: '종로' } });

      act(() => {
        // 라우터 전환보다 긴급 렌더를 먼저 확정해 경합 순서를 고정함
        // eslint-disable-next-line @eslint-react/dom-no-flush-sync
        flushSync(() => vi.advanceTimersByTime(300));
        fireEvent.change(input, { target: { value: '서울' } });
      });

      expect(input).toHaveValue('서울');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');

      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('서울');
      expect(router.state.location.search).toBe('?q=%EC%84%9C%EC%9A%B8');
    } finally {
      vi.useRealTimers();
    }
  });

  test('커밋되지 않은 외부 URL 렌더가 대기 입력을 무효화하지 않는다', async () => {
    vi.useFakeTimers();
    const suspended = new Promise<void>(() => {});
    const { router } = renderSearchRoute(
      '/search',
      <>
        <SearchRoute />
        <SuspendExternalQuery pending={suspended} />
      </>
    );
    try {
      const input = screen.getByRole('searchbox', { name: '지역 검색' });
      fireEvent.change(input, { target: { value: '서울' } });

      await act(async () => {
        await router.navigate('/search?q=external');
      });

      expect(input).toBeVisible();
      expect(input).toHaveValue('서울');
      expect(screen.queryByText('대기 중')).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(300));
      expect(router.state.location.search).toBe('?q=%EC%84%9C%EC%9A%B8');
      expect(input).toHaveValue('서울');
    } finally {
      router.dispose();
      vi.useRealTimers();
    }
  });

  test('외부 back/forward는 대기 입력을 취소하고 URL 값을 복원한다', async () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search?q=%EC%A2%85%EB%A1%9C');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;

      await act(async () => {
        await router.navigate('/search?q=%EB%B6%80%EC%82%B0');
      });
      fireEvent.change(input, { target: { value: '서울' } });
      await act(async () => {
        await router.navigate(-1);
      });

      expect(input).toHaveValue('종로');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');
      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('종로');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');

      fireEvent.change(input, { target: { value: '대전' } });
      await act(async () => {
        await router.navigate(1);
      });

      expect(input).toHaveValue('부산');
      expect(router.state.location.search).toBe('?q=%EB%B6%80%EC%82%B0');
      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('부산');
      expect(router.state.location.search).toBe('?q=%EB%B6%80%EC%82%B0');
    } finally {
      vi.useRealTimers();
    }
  });

  test('빈 URL의 pending 입력은 Escape로 즉시 취소된다', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search');
      const input = document.querySelector<HTMLInputElement>('#search-query')!;

      fireEvent.change(input, { target: { value: '서울' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).toHaveValue('');
      expect(router.state.location.search).toBe('');
      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('');
      expect(router.state.location.search).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  test('highlight 상태의 pending 입력은 Escape로 URL query를 복원한다', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute(
        '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
      );
      const input = document.querySelector<HTMLInputElement>('#search-query')!;
      const option = screen.getAllByRole('option')[0];

      expect(option).toHaveAttribute('aria-selected', 'true');
      fireEvent.change(input, { target: { value: '서울' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).toHaveValue('청운동');
      expect(option).toHaveAttribute('aria-selected', 'false');
      expect(input).not.toHaveAttribute('aria-activedescendant');
      expect(router.state.location.search).toBe(
        '?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
      );

      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('청운동');
      expect(router.state.location.search).toBe(
        '?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test('highlight 상태의 Escape는 진행 중인 자체 URL 전환도 취소한다', () => {
    vi.useFakeTimers();
    try {
      const { router } = renderSearchRoute('/search?q=%EC%A2%85%EB%A1%9C');
      const input = screen.getByRole('searchbox', { name: '지역 검색' });

      fireEvent.change(input, { target: { value: '서울' } });
      act(() => {
        // URL 전환이 시작된 뒤 이전 검색 결과가 표시되는 동안 Escape를 누름
        // eslint-disable-next-line @eslint-react/dom-no-flush-sync
        flushSync(() => vi.advanceTimersByTime(300));
        expect(router.state.location.search).toBe('?q=%EC%84%9C%EC%9A%B8');
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      expect(input).toHaveValue('종로');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');
      expect(input).not.toHaveAttribute('aria-activedescendant');
      act(() => vi.advanceTimersByTime(300));
      expect(input).toHaveValue('종로');
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');
    } finally {
      vi.useRealTimers();
    }
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
  test('선택한 기본 검색 결과의 카탈로그 항목은 검색 산출물에서 복원한다', async () => {
    const reconstructEntry = vi.spyOn(
      searchSelection,
      'getCatalogEntryFromSearchResult'
    );
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
    const { user } = renderSearchRouteWithStorage(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );

    await user.click(
      await screen.findByRole('option', {
        name: /서울특별시-종로구-청운동/i,
      })
    );

    await waitFor(() => {
      expect(reconstructEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          canonicalPath: '서울특별시-종로구-청운동',
          catalogLocationId: '5f5def784f91',
        })
      );
    });
  });

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
        /^\/location\/loc_[0-9a-f]{12}$/
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
        /^\/location\/loc_[0-9a-f]{12}$/
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
    const { router, storage } = renderSearchRoute();

    const recentsHeading = await screen.findByRole('heading', {
      name: '최근 지역',
    });
    const recentsSection = recentsHeading.closest('section')!;
    const btn = within(recentsSection).getByRole('button', { name: /청운동/ });
    await userEvent.setup().click(btn);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/location/loc_5f5def784f91');
    });
    expect(router.state.historyAction).toBe('PUSH');

    const stored = storage.getItem(storageKeys.activeLocation);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.data.source).toBe('recent');
    expect(parsed.data.location.catalogLocationId).toBe('5f5def784f91');
  });

  test('shows the 대한민국 지역 검색 eyebrow label', async () => {
    renderSearchRoute();

    expect(await screen.findByText('대한민국 지역 검색')).toBeVisible();
  });
});
