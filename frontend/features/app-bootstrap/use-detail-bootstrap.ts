// 상세 페이지의 부트스트랩 오케스트레이터.
// resolvedLocationId(라우트 파라미터)를 받아 판별 유니온 상태를 반환합니다.
import { useEffect, useState } from 'react';
import { useActiveLocation } from './active-location-context';
import { useWeatherProvider } from '~/shared/api/weather-provider';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { useAqi } from '~/features/weather-queries/use-aqi';
import {
  buildCatalogLocationFromEntry,
  createCatalogLocationResolver,
  getCatalogEntryById,
} from '~/entities/location';
import { createUnsupportedRouteContextRepository } from '~/shared/lib/storage/repositories/unsupported-route-context-repository';
import {
  createWeatherSnapshotRepository,
  createAqiSnapshotRepository,
} from '~/shared/lib/storage/repositories/snapshot-repositories';
import { coreWeatherToSnapshot } from '~/entities/weather/model/core-weather-to-snapshot';
import { aqiToSnapshot } from '~/entities/aqi/model/aqi-to-snapshot';
import { isWeatherSnapshotFresh, isAqiSnapshotFresh } from './snapshot-cutoff';
import type {
  ResolvedLocation,
  ActiveLocation,
} from '~/entities/location/model/types';
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

type ColdLoadStatus = 'idle' | 'resolving' | 'failed';

export function useDetailBootstrap(
  resolvedLocationId: string
): DetailBootstrapState {
  const { activeLocation, setActiveLocation } = useActiveLocation();
  const { geocode } = useWeatherProvider();
  const [coldLoadStatus, setColdLoadStatus] = useState<ColdLoadStatus>('idle');

  const isUnsupported = resolvedLocationId.startsWith('unsupported::');

  // resolvedLocation 파생: unsupported 라우트이거나 활성 위치가 일치하지 않으면 null
  const resolvedLocation: ResolvedLocation | null =
    !isUnsupported &&
    activeLocation?.kind === 'resolved' &&
    activeLocation.location.locationId === resolvedLocationId
      ? activeLocation.location
      : null;

  // activeLocation이 없을 때 카탈로그에서 위치를 자동으로 해결합니다 (북마크 / 딥링크 지원).
  const needsColdLoad = !isUnsupported && activeLocation === null;

  useEffect(() => {
    if (!needsColdLoad || coldLoadStatus !== 'idle') return;

    // loc_ 접두사를 제거하여 catalogLocationId를 추출합니다.
    const catalogLocationId = resolvedLocationId.startsWith('loc_')
      ? resolvedLocationId.slice(4)
      : resolvedLocationId;

    // 상태 변경을 모두 비동기 콜백 안에서 수행합니다 (동기 setState 경고 방지).
    Promise.resolve(getCatalogEntryById(catalogLocationId))
      .then((entry) => {
        if (!entry) {
          setColdLoadStatus('failed');
          return;
        }
        setColdLoadStatus('resolving');

        const resolver = createCatalogLocationResolver({
          geocode,
          now: () => new Date().toISOString(),
          unsupportedRouteContextRepository:
            createUnsupportedRouteContextRepository(),
        });

        return resolver
          .resolveCatalogLocation({
            catalogLocation: buildCatalogLocationFromEntry(entry),
            canonicalPath: entry.canonicalPath,
            overrideKey: entry.overrideKey,
          })
          .then((resolution) => {
            if (resolution.kind === 'resolved') {
              const loc: ActiveLocation = {
                kind: 'resolved',
                location: resolution.location,
                source: 'search',
                changedAt: new Date().toISOString(),
              };
              setActiveLocation(loc);
              setColdLoadStatus('idle');
            } else {
              setColdLoadStatus('failed');
            }
          });
      })
      .catch(() => setColdLoadStatus('failed'));
  }, [
    needsColdLoad,
    coldLoadStatus,
    resolvedLocationId,
    geocode,
    setActiveLocation,
  ]);

  const weatherQuery = useCoreWeather(resolvedLocation);
  const aqiQuery = useAqi(resolvedLocation);

  // config-error는 홈 부트스트랩에서만 처리합니다.
  // 상세 페이지에서 설정 오류가 발생하면 쿼리 실패 → recoverable-error로 폴백됩니다.

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
  if (isUnsupported) {
    return {
      kind: 'unsupported',
      catalogLocationId: resolvedLocationId.slice('unsupported::'.length),
    };
  }

  // activeLocation이 없음 → 콜드 로드 진행 중이거나 실패한 경우
  if (activeLocation === null) {
    return coldLoadStatus === 'failed'
      ? { kind: 'not-found' }
      : { kind: 'loading' };
  }

  // 활성 위치가 있지만 URL과 일치하지 않음 → not-found
  if (
    activeLocation.kind !== 'resolved' ||
    activeLocation.location.locationId !== resolvedLocationId
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
