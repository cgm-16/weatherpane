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
    queryFn: () => {
      if (!location)
        throw new Error('location 없이 AQI 데이터를 요청할 수 없습니다');
      return provider.getAqi(location);
    },
    enabled: location !== null,
    staleTime: AQI_STALE_TIME,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: REFETCH_ON_FOCUS,
  });
}
