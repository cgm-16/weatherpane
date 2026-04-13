import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveLocation } from './active-location-context';
import { refreshLocation } from '~/features/weather-queries/refresh-location';

// 온라인 복구 시 현재 활성 위치의 날씨 쿼리를 자동 갱신합니다.
export function useOnlineRecovery(): void {
  const queryClient = useQueryClient();
  const { activeLocation } = useActiveLocation();
  const wasOfflineRef = useRef(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const locationId =
    activeLocation?.kind === 'resolved'
      ? activeLocation.location.locationId
      : null;

  useEffect(() => {
    function handleOnline() {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        if (locationId) {
          refreshLocation(queryClient, locationId);
        }
      }
    }

    function handleOffline() {
      wasOfflineRef.current = true;
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, locationId]);
}
