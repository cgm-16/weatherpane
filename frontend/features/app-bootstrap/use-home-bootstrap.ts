// 홈 페이지의 핵심 부트스트랩 오케스트레이터.
// 시작 우선순위 → 쿼리 → 스냅샷 쓰기 → 폴백/에러 분기를 한 곳에서 처리합니다.
import { useEffect } from 'react';
import { useActiveLocation } from './active-location-context';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { useAqi } from '~/features/weather-queries/use-aqi';
import { getConfigError } from '~/app/providers/app-providers';
import { createWeatherSnapshotRepository, createAqiSnapshotRepository } from '~/shared/lib/storage/repositories/snapshot-repositories';
import { coreWeatherToSnapshot } from '~/entities/weather/model/core-weather-to-snapshot';
import { aqiToSnapshot } from '~/entities/aqi/model/aqi-to-snapshot';
import { isWeatherSnapshotFresh, isAqiSnapshotFresh } from './snapshot-cutoff';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';
import type { Aqi } from '~/entities/aqi/model/aqi';
import type { PersistedWeatherSnapshot } from '~/entities/weather/model/persisted-weather-snapshot';
import type { PersistedAqiSnapshot } from '~/entities/aqi/model/persisted-aqi-snapshot';
import type { ConfigError } from '~/shared/lib/env-config';

export type HomeBootstrapState =
  | { kind: 'no-location' }
  | { kind: 'config-error'; error: ConfigError }
  | { kind: 'loading' }
  | { kind: 'data'; location: ResolvedLocation; weather: CoreWeather; aqi: Aqi }
  | { kind: 'stale-fallback'; location: ResolvedLocation; weather: PersistedWeatherSnapshot; aqi: PersistedAqiSnapshot | null }
  | { kind: 'recoverable-error'; location: ResolvedLocation };

export function useHomeBootstrap(): HomeBootstrapState {
  const { activeLocation } = useActiveLocation();

  // resolved 위치만 날씨 쿼리에 전달합니다. raw-gps는 지원하지 않습니다(WP-010 이후 연결 예정).
  const resolvedLocation: ResolvedLocation | null =
    activeLocation?.kind === 'resolved' ? activeLocation.location : null;

  const weatherQuery = useCoreWeather(resolvedLocation);
  const aqiQuery = useAqi(resolvedLocation);

  // 성공 시 스냅샷 저장 — 다음 오프라인 진입을 대비합니다.
  useEffect(() => {
    if (weatherQuery.data && aqiQuery.data && resolvedLocation) {
      createWeatherSnapshotRepository().set(
        resolvedLocation.locationId,
        coreWeatherToSnapshot(weatherQuery.data)
      );
      createAqiSnapshotRepository().set(
        resolvedLocation.locationId,
        aqiToSnapshot(aqiQuery.data)
      );
    }
  }, [weatherQuery.data, aqiQuery.data, resolvedLocation]);

  // 훅 호출 이후에 조건부 반환합니다 (Rules of Hooks 준수).
  const configError = getConfigError();
  if (configError) return { kind: 'config-error', error: configError };

  if (!activeLocation || activeLocation.kind === 'raw-gps') {
    return { kind: 'no-location' };
  }

  const location = resolvedLocation!;

  if (weatherQuery.isPending || weatherQuery.isLoading) {
    return { kind: 'loading' };
  }

  if (weatherQuery.data && aqiQuery.data) {
    return { kind: 'data', location, weather: weatherQuery.data, aqi: aqiQuery.data };
  }

  // fetch 실패 → 스냅샷 폴백 시도 (날씨 또는 AQI 중 하나라도 실패하면 진입합니다)
  if (weatherQuery.isError || aqiQuery.isError) {
    const weatherSnapshot = createWeatherSnapshotRepository().get(location.locationId);
    const aqiSnapshot = createAqiSnapshotRepository().get(location.locationId);

    if (weatherSnapshot && isWeatherSnapshotFresh(weatherSnapshot.fetchedAt)) {
      const freshAqi =
        aqiSnapshot && isAqiSnapshotFresh(aqiSnapshot.fetchedAt) ? aqiSnapshot : null;
      return { kind: 'stale-fallback', location, weather: weatherSnapshot, aqi: freshAqi };
    }

    return { kind: 'recoverable-error', location };
  }

  return { kind: 'loading' };
}
