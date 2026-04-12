// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type QueryState,
} from '@tanstack/react-query';
import React from 'react';
import {
  runRefreshQueue,
  useRefreshQueue,
} from '../frontend/features/favorites/use-refresh-queue';
import type { FavoriteLocation } from '../frontend/entities/location/model/types';

function makeFav(id: string, order = 0): FavoriteLocation {
  return {
    favoriteId: `fav-${id}`,
    location: {
      kind: 'resolved',
      locationId: `loc-${id}`,
      catalogLocationId: id,
      name: `도시 ${id}`,
      admin1: '서울특별시',
      latitude: 37,
      longitude: 127,
      timezone: 'Asia/Seoul',
    },
    nickname: null,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('runRefreshQueue', () => {
  test('skips non-stale favorites (data updated < staleMs ago)', async () => {
    const fav = makeFav('A');
    const refetch = vi.fn().mockResolvedValue(undefined);
    const getQueryState = vi.fn().mockReturnValue({
      dataUpdatedAt: Date.now() - 1_000, // 1s ago — fresh
    });
    await runRefreshQueue([fav], { getQueryState, refetch }, 10 * 60_000);
    expect(refetch).not.toHaveBeenCalled();
  });

  test('refreshes stale favorites (data updated > staleMs ago)', async () => {
    const fav = makeFav('B');
    const refetch = vi.fn().mockResolvedValue(undefined);
    const getQueryState = vi.fn().mockReturnValue({
      dataUpdatedAt: Date.now() - 15 * 60_000, // 15m ago — stale
    });
    await runRefreshQueue([fav], { getQueryState, refetch }, 10 * 60_000);
    expect(refetch).toHaveBeenCalledOnce();
    expect(refetch).toHaveBeenCalledWith('loc-B');
  });

  test('refreshes favorites with no cached data (dataUpdatedAt undefined)', async () => {
    const fav = makeFav('C');
    const refetch = vi.fn().mockResolvedValue(undefined);
    const getQueryState = vi.fn().mockReturnValue({ dataUpdatedAt: undefined });
    await runRefreshQueue([fav], { getQueryState, refetch }, 10 * 60_000);
    expect(refetch).toHaveBeenCalledOnce();
  });

  test('continues queue when one card refresh fails', async () => {
    const favA = makeFav('A');
    const favB = makeFav('B');
    const refetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    const getQueryState = vi.fn().mockReturnValue({ dataUpdatedAt: 0 }); // always stale
    await runRefreshQueue(
      [favA, favB],
      { getQueryState, refetch },
      10 * 60_000
    );
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  test('runs at most 2 refetches concurrently', async () => {
    const favs = [makeFav('A'), makeFav('B'), makeFav('C')];
    let concurrent = 0;
    let maxConcurrent = 0;
    const refetch = vi.fn().mockImplementation(() => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          concurrent--;
          resolve();
        }, 10)
      );
    });
    const getQueryState = vi.fn().mockReturnValue({ dataUpdatedAt: 0 }); // always stale
    await runRefreshQueue(favs, { getQueryState, refetch }, 10 * 60_000);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(refetch).toHaveBeenCalledTimes(3);
  });
});

describe('useRefreshQueue hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('triggers refetch on mount for stale favorites', async () => {
    const qc = new QueryClient();
    const favA = makeFav('A');

    const refetchSpy = vi.spyOn(qc, 'refetchQueries').mockResolvedValue();

    // Make query appear stale (dataUpdatedAt = 0 = always stale)
    vi.spyOn(qc, 'getQueryState').mockReturnValue({
      dataUpdatedAt: 0,
    } as unknown as QueryState<unknown>);

    function wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: qc }, children);
    }

    await act(async () => {
      renderHook(() => useRefreshQueue([favA]), { wrapper });
      // Allow mount effects to run
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refetchSpy).toHaveBeenCalled();
  });

  test('does not refetch fresh favorites on mount', async () => {
    const qc = new QueryClient();
    const favA = makeFav('A');

    const refetchSpy = vi.spyOn(qc, 'refetchQueries').mockResolvedValue();

    // Make query appear fresh (dataUpdatedAt = now)
    vi.spyOn(qc, 'getQueryState').mockReturnValue({
      dataUpdatedAt: Date.now(),
    } as unknown as QueryState<unknown>);

    function wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: qc }, children);
    }

    await act(async () => {
      renderHook(() => useRefreshQueue([favA]), { wrapper });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refetchSpy).not.toHaveBeenCalled();
  });
});
