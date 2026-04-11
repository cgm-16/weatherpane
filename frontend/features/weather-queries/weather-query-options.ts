import { queryOptions } from '@tanstack/react-query';

import type { ResolvedLocation } from '~/entities/location';
import type { WeatherProvider } from '~/shared/api/weather-provider';
import { weatherQueryKeys } from './query-keys';

export const CORE_WEATHER_STALE_TIME = 10 * 60 * 1000;
export const AQI_STALE_TIME = 30 * 60 * 1000;
export const QUERY_RETRY = 1;
export const REFETCH_ON_FOCUS = true as const;

export function coreWeatherQueryOptions(
  location: ResolvedLocation,
  provider: WeatherProvider
) {
  return queryOptions({
    queryKey: weatherQueryKeys.coreWeather(location.locationId),
    queryFn: () => provider.getCoreWeather(location),
    staleTime: CORE_WEATHER_STALE_TIME,
    retry: QUERY_RETRY,
    refetchOnWindowFocus: REFETCH_ON_FOCUS,
  });
}
