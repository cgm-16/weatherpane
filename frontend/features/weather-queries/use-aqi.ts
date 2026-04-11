import { useQuery } from '@tanstack/react-query';

import type { ResolvedLocation } from '~/entities/location';
import { useWeatherProvider } from '~/shared/api/weather-provider';
import { weatherQueryKeys } from './query-keys';
import {
  AQI_STALE_TIME,
  QUERY_RETRY,
  REFETCH_ON_FOCUS,
} from './weather-query-options';

export function useAqi(location: ResolvedLocation | null) {
  const provider = useWeatherProvider();
  return useQuery({
    queryKey: weatherQueryKeys.aqi(location?.locationId ?? ''),
    queryFn: () => provider.getAqi(location!),
    enabled: location !== null,
    staleTime: AQI_STALE_TIME,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: REFETCH_ON_FOCUS,
  });
}
