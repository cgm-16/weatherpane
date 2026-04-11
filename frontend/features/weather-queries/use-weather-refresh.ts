import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { refreshLocation } from './refresh-location';

export function useWeatherRefresh() {
  const queryClient = useQueryClient();
  return useCallback(
    (locationId: string) => refreshLocation(queryClient, locationId),
    [queryClient]
  );
}
