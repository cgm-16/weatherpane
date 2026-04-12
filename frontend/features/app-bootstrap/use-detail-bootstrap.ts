// 상세 페이지의 부트스트랩 오케스트레이터.
// resolvedLocationId(라우트 파라미터)를 받아 판별 유니온 상태를 반환합니다.
import { useEffect } from 'react';
import { useActiveLocation } from './active-location-context';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { useAqi } from '~/features/weather-queries/use-aqi';
import {
  createWeatherSnapshotRepository,
  createAqiSnapshotRepository,
} from '~/shared/lib/storage/repositories/snapshot-repositories';
import { coreWeatherToSnapshot } from '~/entities/weather/model/core-weather-to-snapshot';
import { aqiToSnapshot } from '~/entities/aqi/model/aqi-to-snapshot';
import { isWeatherSnapshotFresh, isAqiSnapshotFresh } from './snapshot-cutoff';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';
import type { Aqi } from '~/entities/aqi/model/aqi';
import type { PersistedWeatherSnapshot } from '~/entities/weather/model/persisted-weather-snapshot';
import type { PersistedAqiSnapshot } from '~/entities/aqi/model/persisted-aqi-snapshot';

export type DetailBootstrapState =
  | { kind: 'unsupported'; catalogLocationId: string }
  | { kind: 'not-found' }
  | { kind: 'loading' }
  | {
      kind: 'data';
      location: ResolvedLocation;
      weather: CoreWeather;
      aqi: Aqi;
      isRefreshing: boolean;
      hasRefreshError: boolean;
    }
  | {
      kind: 'stale-fallback';
      location: ResolvedLocation;
      weather: PersistedWeatherSnapshot;
      aqi: PersistedAqiSnapshot | null;
    }
  | { kind: 'recoverable-error'; location: ResolvedLocation };

export function useDetailBootstrap(
  resolvedLocationId: string
): DetailBootstrapState {
  const { activeLocation } = useActiveLocation();

  // resolved 위치만 날씨 쿼리에 전달합니다.
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

  // unsupported:: 접두사 → 지원하지 않는 위치
  if (resolvedLocationId.startsWith('unsupported::')) {
    const catalogLocationId = resolvedLocationId.slice('unsupported::'.length);
    return { kind: 'unsupported', catalogLocationId };
  }

  // 활성 위치가 없거나 catalogLocationId가 일치하지 않으면 not-found 반환
  if (
    !activeLocation ||
    activeLocation.kind !== 'resolved' ||
    activeLocation.location.catalogLocationId !== resolvedLocationId
  ) {
    return { kind: 'not-found' };
  }

  const location = resolvedLocation!;

  if (weatherQuery.isPending || weatherQuery.isLoading) {
    return { kind: 'loading' };
  }

  if (weatherQuery.data && aqiQuery.data) {
    return {
      kind: 'data',
      location,
      weather: weatherQuery.data,
      aqi: aqiQuery.data,
      isRefreshing: weatherQuery.isFetching || aqiQuery.isFetching,
      // 재시도 중인 경우 오류 표시를 억제합니다 — 두 쿼리 모두 완료된 후에만 표시합니다.
      hasRefreshError:
        (weatherQuery.isError || aqiQuery.isError) &&
        !weatherQuery.isFetching &&
        !aqiQuery.isFetching,
    };
  }

  // fetch 실패 → 스냅샷 폴백 시도 (날씨 또는 AQI 중 하나라도 실패하면 진입합니다)
  if (weatherQuery.isError || aqiQuery.isError) {
    const weatherSnapshot = createWeatherSnapshotRepository().get(
      location.locationId
    );
    const aqiSnapshot = createAqiSnapshotRepository().get(location.locationId);

    if (weatherSnapshot && isWeatherSnapshotFresh(weatherSnapshot.fetchedAt)) {
      const freshAqi =
        aqiSnapshot && isAqiSnapshotFresh(aqiSnapshot.fetchedAt)
          ? aqiSnapshot
          : null;
      return {
        kind: 'stale-fallback',
        location,
        weather: weatherSnapshot,
        aqi: freshAqi,
      };
    }

    return { kind: 'recoverable-error', location };
  }

  return { kind: 'loading' };
}
