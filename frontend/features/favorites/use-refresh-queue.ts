import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FavoriteLocation } from '~/entities/location/model/types';
import { weatherQueryKeys } from '~/features/weather-queries/query-keys';
import { CORE_WEATHER_STALE_TIME } from '~/features/weather-queries/weather-query-options';

const CONCURRENCY = 2;

// 어댑터 인터페이스: 실제 QueryClient 없이 runRefreshQueue를 테스트할 수 있게 한다
interface QueueAdapter {
  getQueryState: (
    locationId: string
  ) => { dataUpdatedAt?: number; fetchStatus?: string } | undefined;
  refetch: (locationId: string) => Promise<unknown>;
}

function isStale(dataUpdatedAt: number | undefined, staleMs: number): boolean {
  if (!dataUpdatedAt) return true;
  return Date.now() - dataUpdatedAt > staleMs;
}

// 단위 테스트를 위해 별도로 내보낸다
export async function runRefreshQueue(
  favorites: FavoriteLocation[],
  adapter: QueueAdapter,
  staleMs: number
): Promise<void> {
  const staleLocations = favorites.filter((fav) => {
    const state = adapter.getQueryState(fav.location.locationId);
    // 이미 진행 중인 요청은 건너뛰어 이중 패칭을 방지한다
    if (state?.fetchStatus === 'fetching') return false;
    return isStale(state?.dataUpdatedAt, staleMs);
  });

  for (let i = 0; i < staleLocations.length; i += CONCURRENCY) {
    const batch = staleLocations.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map((fav) => adapter.refetch(fav.location.locationId))
    );
  }
}

export function useRefreshQueue(favorites: FavoriteLocation[]): void {
  const queryClient = useQueryClient();
  const isRefreshingRef = useRef(false);

  const runQueue = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const adapter: QueueAdapter = {
        getQueryState: (locationId) =>
          queryClient.getQueryState(
            weatherQueryKeys.coreWeather(locationId)
          ) as { dataUpdatedAt?: number; fetchStatus?: string } | undefined,
        refetch: (locationId) =>
          queryClient.refetchQueries({
            queryKey: weatherQueryKeys.coreWeather(locationId),
            exact: true,
          }),
      };
      await runRefreshQueue(favorites, adapter, CORE_WEATHER_STALE_TIME);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [favorites, queryClient]);

  // 마운트 시 실행: useCoreWeather의 초기 패칭과 중복되지 않도록 마이크로태스크 이후에 시작한다
  useEffect(() => {
    Promise.resolve().then(() => runQueue());
  }, [runQueue]);
}
