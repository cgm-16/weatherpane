// 핵심 날씨 조회에 영속 스냅샷 폴백을 얹어, 화면이 그릴 정규화된 표시 상태만 돌려준다.
// 스냅샷 쓰기·읽기와 24h cutoff 판단은 모두 여기에 있고, 페이지 컴포넌트는 결과만 렌더한다.
//
// Home/Detail의 부트스트랩 훅과 폴백 조건이 다르다: 그쪽은 조회가 '실패한 뒤에만' 폴백하지만,
// 이 훅은 '세션 내 결과가 없으면' 폴백한다(오프라인에서 쿼리가 일시 중지된 경우 포함).
// TanStack Query v5의 기본 networkMode는 'online'이라 오프라인 쿼리는 실패가 아니라 중지되며,
// isError는 false로 남기 때문이다.
import { useEffect, useReducer } from 'react';

import { isWeatherSnapshotFresh } from '~/features/app-bootstrap/snapshot-cutoff';
import { coreWeatherToSnapshot } from '~/entities/weather/model/core-weather-to-snapshot';
import { createWeatherSnapshotRepository } from '~/shared/lib/storage/repositories/snapshot-repositories';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type {
  CoreWeather,
  WeatherCondition,
} from '~/entities/weather/model/core-weather';
import type { PersistedWeatherSnapshot } from '~/entities/weather/model/persisted-weather-snapshot';
import { useCoreWeather } from './use-core-weather';

// 신선도 배지와 24h cutoff는 데이터가 아니라 시간이 지나면서 바뀐다.
// 쿼리 상태가 그대로여도 주기적으로 다시 평가해야 만료된 스냅샷이 계속 남지 않는다.
const FRESHNESS_RECHECK_MS = 60_000;

// 카드가 실제로 그리는 필드만 담은 정규화 모델. 세션 내 조회 결과(CoreWeather)와
// 영속 스냅샷(PersistedWeatherSnapshot)을 같은 표면으로 렌더링하기 위한 것이다.
export interface WeatherSummaryView {
  fetchedAt: string;
  temperatureC: number;
  conditionText: string;
  // 스케치 키 결정에는 visualBucket/isDay가 필요하다. 영속 스냅샷은 이를 저장하지 않으므로
  // 폴백 경로에서는 null이며, 화면은 그때 스케치 배경을 생략한다.
  condition: WeatherCondition | null;
  todayMinC: number;
  todayMaxC: number;
}

export type WeatherSummaryState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | {
      kind: 'weather';
      weather: WeatherSummaryView;
      hasRefreshError: boolean;
    };

function fromCoreWeather(weather: CoreWeather): WeatherSummaryView {
  return {
    fetchedAt: weather.fetchedAt,
    temperatureC: weather.current.temperatureC,
    conditionText: weather.current.condition.text,
    condition: weather.current.condition,
    todayMinC: weather.today.minC,
    todayMaxC: weather.today.maxC,
  };
}

function fromSnapshot(snapshot: PersistedWeatherSnapshot): WeatherSummaryView {
  return {
    fetchedAt: snapshot.fetchedAt,
    temperatureC: snapshot.temperatureC,
    conditionText: snapshot.conditionText,
    condition: null,
    todayMinC: snapshot.todayMinC,
    todayMaxC: snapshot.todayMaxC,
  };
}

export function useCoreWeatherWithSnapshotFallback(
  location: ResolvedLocation
): { state: WeatherSummaryState; refetch: () => void } {
  const query = useCoreWeather(location);
  const { locationId } = location;

  // 조회 성공 시 스냅샷을 저장한다 — 다음 오프라인 진입에서 폴백할 대상이다.
  // Home/Detail을 거치지 않고 즐겨찾기 화면에서만 본 위치도 폴백을 갖게 된다.
  useEffect(() => {
    if (query.data) {
      createWeatherSnapshotRepository().set(
        locationId,
        coreWeatherToSnapshot(query.data)
      );
    }
  }, [query.data, locationId]);

  const [, recheckFreshness] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(recheckFreshness, FRESHNESS_RECHECK_MS);
    return () => clearInterval(id);
  }, [recheckFreshness]);

  return { state: resolveState(), refetch: () => void query.refetch() };

  function resolveState(): WeatherSummaryState {
    if (query.data) {
      return {
        kind: 'weather',
        weather: fromCoreWeather(query.data),
        hasRefreshError: query.isError,
      };
    }

    const snapshot = createWeatherSnapshotRepository().get(locationId);
    if (snapshot && isWeatherSnapshotFresh(snapshot.fetchedAt)) {
      return {
        kind: 'weather',
        weather: fromSnapshot(snapshot),
        hasRefreshError: query.isError,
      };
    }

    if (query.isLoading) return { kind: 'loading' };
    return { kind: 'unavailable' };
  }
}
