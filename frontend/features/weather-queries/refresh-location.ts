import type { QueryClient } from '@tanstack/react-query';

import { weatherQueryKeys } from './query-keys';

export async function refreshLocation(
  queryClient: QueryClient,
  locationId: string
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: weatherQueryKeys.coreWeather(locationId),
    }),
    queryClient.invalidateQueries({
      queryKey: weatherQueryKeys.aqi(locationId),
    }),
  ]);
}
