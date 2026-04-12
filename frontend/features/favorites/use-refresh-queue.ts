import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FavoriteLocation } from '~/entities/location/model/types';
import { weatherQueryKeys } from '~/features/weather-queries/query-keys';
import { CORE_WEATHER_STALE_TIME } from '~/features/weather-queries/weather-query-options';

const CONCURRENCY = 2;

// Adapter interface lets runRefreshQueue be tested without a real QueryClient
interface QueueAdapter {
  getQueryState: (locationId: string) => { dataUpdatedAt?: number } | undefined;
  refetch: (locationId: string) => Promise<unknown>;
}

function isStale(dataUpdatedAt: number | undefined, staleMs: number): boolean {
  if (!dataUpdatedAt) return true;
  return Date.now() - dataUpdatedAt > staleMs;
}

// Exported separately for unit testing
export async function runRefreshQueue(
  favorites: FavoriteLocation[],
  adapter: QueueAdapter,
  staleMs: number
): Promise<void> {
  const staleLocations = favorites.filter((fav) => {
    const state = adapter.getQueryState(fav.location.locationId);
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

  const runQueue = useCallback(async () => {
    const adapter: QueueAdapter = {
      getQueryState: (locationId) =>
        queryClient.getQueryState(weatherQueryKeys.coreWeather(locationId)) as
          | { dataUpdatedAt?: number }
          | undefined,
      refetch: (locationId) =>
        queryClient.refetchQueries({
          queryKey: weatherQueryKeys.coreWeather(locationId),
          exact: true,
        }),
    };
    await runRefreshQueue(favorites, adapter, CORE_WEATHER_STALE_TIME);
  }, [favorites, queryClient]);

  // Run on mount
  useEffect(() => {
    runQueue();
  }, [runQueue]);

  // Run on window focus
  useEffect(() => {
    const handleFocus = () => {
      runQueue();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [runQueue]);
}
