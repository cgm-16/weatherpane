// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';

vi.mock('../frontend/features/app-bootstrap/active-location-context', () => ({
  useActiveLocation: vi.fn(),
}));
vi.mock('../frontend/features/weather-queries/use-core-weather', () => ({
  useCoreWeather: vi.fn(),
}));
vi.mock('../frontend/features/weather-queries/use-aqi', () => ({
  useAqi: vi.fn(),
}));
vi.mock(
  '../frontend/shared/lib/storage/repositories/snapshot-repositories',
  () => ({
    createWeatherSnapshotRepository: vi.fn(() => ({
      get: vi.fn(() => null),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    })),
    createAqiSnapshotRepository: vi.fn(() => ({
      get: vi.fn(() => null),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    })),
  })
);
vi.mock('../frontend/shared/api/weather-provider', () => ({
  useWeatherProvider: vi.fn(() => ({ geocode: vi.fn() })),
}));
vi.mock('../frontend/entities/location', () => ({
  // 기본값: 카탈로그 항목 없음 → 콜드 로드 실패 → not-found
  getCatalogEntryById: vi.fn(() => null),
  buildCatalogLocationFromEntry: vi.fn(),
  createCatalogLocationResolver: vi.fn(() => ({
    resolveCatalogLocation: vi
      .fn()
      .mockResolvedValue({ kind: 'unsupported', token: 'x' }),
  })),
}));
vi.mock(
  '../frontend/shared/lib/storage/repositories/unsupported-route-context-repository',
  () => ({
    createUnsupportedRouteContextRepository: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
    })),
  })
);

import { useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { useCoreWeather } from '../frontend/features/weather-queries/use-core-weather';
import { useAqi } from '../frontend/features/weather-queries/use-aqi';
import {
  createWeatherSnapshotRepository,
  createAqiSnapshotRepository,
} from '../frontend/shared/lib/storage/repositories/snapshot-repositories';
import {
  getCatalogEntryById,
  createCatalogLocationResolver,
} from '../frontend/entities/location';
import { useDetailBootstrap } from '../frontend/features/app-bootstrap/use-detail-bootstrap';

const location = {
  kind: 'resolved' as const,
  locationId: 'loc_test',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const resolvedCtx = {
  activeLocation: {
    kind: 'resolved' as const,
    location,
    source: 'search' as const,
    changedAt: '2026-04-12T10:00:00Z',
  },
  setActiveLocation: vi.fn(),
  clearActiveLocation: vi.fn(),
};
const noCtx = {
  activeLocation: null,
  setActiveLocation: vi.fn(),
  clearActiveLocation: vi.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pendingQuery(): any {
  return {
    isPending: true,
    isLoading: true,
    isFetching: true,
    data: undefined,
    isError: false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorQuery(): any {
  return {
    isPending: false,
    isLoading: false,
    isFetching: false,
    data: undefined,
    isError: true,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function successQuery(data: unknown, isFetching = false): any {
  return {
    isPending: false,
    isLoading: false,
    isFetching,
    data,
    isError: false,
  };
}

const now = new Date().toISOString();
const weather: CoreWeather = {
  locationId: 'loc_test',
  fetchedAt: now,
  observedAt: now,
  current: {
    temperatureC: 18,
    condition: {
      code: 'CLEAR',
      text: '맑음',
      isDay: true,
      visualBucket: 'clear',
      textMapping: {
        conditionCode: 'CLEAR',
        isDay: true,
        precipitationKind: 'none',
        cloudCoverPct: 5,
        intensity: 'none',
      },
    },
  },
  today: { minC: 10, maxC: 22 },
  hourly: [],
  source: { provider: 'mock' },
};
const aqi: Aqi = {
  locationId: 'loc_test',
  fetchedAt: now,
  observedAt: now,
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createWeatherSnapshotRepository).mockReturnValue({
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  });
  vi.mocked(createAqiSnapshotRepository).mockReturnValue({
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  });
  // 기본값 복원: 카탈로그 항목 없음
  vi.mocked(getCatalogEntryById).mockReturnValue(null);
  vi.mocked(createCatalogLocationResolver).mockReturnValue({
    resolveCatalogLocation: vi
      .fn()
      .mockResolvedValue({ kind: 'unsupported', token: 'x' }),
  });
});

describe('useDetailBootstrap', () => {
  test('unsupported:: 접두사 → unsupported 반환, catalogLocationId 포함', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() =>
      useDetailBootstrap('unsupported::KR-Busan')
    );
    expect(result.current.kind).toBe('unsupported');
    if (result.current.kind === 'unsupported') {
      expect(result.current.catalogLocationId).toBe('KR-Busan');
    }
  });

  test('활성 위치 없음, 카탈로그 미스 → not-found 반환', async () => {
    vi.mocked(useActiveLocation).mockReturnValue(noCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    // getCatalogEntryById는 기본적으로 null 반환
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    await waitFor(() => expect(result.current.kind).toBe('not-found'));
  });

  test('활성 위치가 locationId와 불일치 → not-found 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_busan'));
    expect(result.current.kind).toBe('not-found');
  });

  test('쿼리 로딩 중 → loading 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('loading');
  });

  test('두 쿼리 성공 → data 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('data');
  });

  test('data + 하나가 isFetching → isRefreshing: true', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather, true));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('data');
    if (result.current.kind === 'data') {
      expect(result.current.isRefreshing).toBe(true);
    }
  });

  test('fetch 실패 + 유효 스냅샷 → stale-fallback 반환', () => {
    const fresh = new Date(Date.now() - 60_000).toISOString();
    const ws = {
      locationId: 'loc_test',
      fetchedAt: fresh,
      observedAt: fresh,
      temperatureC: 17,
      conditionCode: 'CLEAR',
      conditionText: '맑음',
      todayMinC: 10,
      todayMaxC: 22,
      source: { provider: 'mock' },
    };
    vi.mocked(createWeatherSnapshotRepository).mockReturnValue({
      get: vi.fn(() => ws),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('stale-fallback');
  });

  test('fetch 실패 + 만료된 스냅샷 → recoverable-error 반환', () => {
    const stale = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const ws = {
      locationId: 'loc_test',
      fetchedAt: stale,
      observedAt: stale,
      temperatureC: 17,
      conditionCode: 'CLEAR',
      conditionText: '맑음',
      todayMinC: 10,
      todayMaxC: 22,
      source: { provider: 'mock' },
    };
    vi.mocked(createWeatherSnapshotRepository).mockReturnValue({
      get: vi.fn(() => ws),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('recoverable-error');
  });

  test('fetch 실패 + 스냅샷 없음 → recoverable-error 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('recoverable-error');
  });

  test('data + 하나가 isError이며 isFetching이 아니면 hasRefreshError: true', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather));
    vi.mocked(useAqi).mockReturnValue({ ...successQuery(aqi), isError: true });
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('data');
    if (result.current.kind === 'data') {
      expect(result.current.hasRefreshError).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
    }
  });

  test('fetch 실패 + 유효 날씨·AQI 스냅샷 → stale-fallback에 aqi 포함', () => {
    const fresh = new Date(Date.now() - 60_000).toISOString();
    const ws = {
      locationId: 'loc_test',
      fetchedAt: fresh,
      observedAt: fresh,
      temperatureC: 17,
      conditionCode: 'CLEAR',
      conditionText: '맑음',
      todayMinC: 10,
      todayMaxC: 22,
      source: { provider: 'mock' },
    };
    const as_ = {
      locationId: 'loc_test',
      fetchedAt: fresh,
      observedAt: fresh,
      aqi: 2,
      category: 'fair',
      source: { provider: 'mock' },
    };
    vi.mocked(createWeatherSnapshotRepository).mockReturnValue({
      get: vi.fn(() => ws),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(createAqiSnapshotRepository).mockReturnValue({
      get: vi.fn(() => as_),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useDetailBootstrap('loc_test'));
    expect(result.current.kind).toBe('stale-fallback');
    if (result.current.kind === 'stale-fallback') {
      expect(result.current.aqi).not.toBeNull();
    }
  });

  describe('콜드 로드 해결 (activeLocation 없음)', () => {
    test('카탈로그 히트 + 지오코딩 성공 → setActiveLocation 호출 후 loading 반환', async () => {
      const resolvedLoc = { ...location };
      vi.mocked(getCatalogEntryById).mockReturnValue({
        catalogLocationId: 'KR-Seoul',
        canonicalPath: '서울특별시',
        depth: 1,
        siDo: '서울특별시',
        leafLabel: '서울',
        tokens: ['서울특별시'],
        display: { primaryLabel: '서울', secondaryLabel: null },
        archetypeKey: null,
        overrideKey: null,
      });
      vi.mocked(createCatalogLocationResolver).mockReturnValue({
        resolveCatalogLocation: vi.fn().mockResolvedValue({
          kind: 'resolved',
          routeId: 'loc_test',
          location: resolvedLoc,
        }),
      });

      // setActiveLocation 호출 시 activeLocation을 갱신하여 콜드 로드 루프를 중단합니다.
      const setActiveLocation = vi.fn((loc) => {
        vi.mocked(useActiveLocation).mockReturnValue({
          activeLocation: {
            kind: 'resolved',
            location: loc.location,
            source: loc.source,
            changedAt: loc.changedAt,
          },
          setActiveLocation,
          clearActiveLocation: vi.fn(),
        });
      });
      vi.mocked(useActiveLocation).mockReturnValue({
        ...noCtx,
        setActiveLocation,
      });
      vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
      vi.mocked(useAqi).mockReturnValue(pendingQuery());

      const { result } = renderHook(() => useDetailBootstrap('loc_test'));

      // 최초 렌더링은 loading (콜드 로드 시작 전)
      expect(result.current.kind).toBe('loading');

      // 해결 성공 후 setActiveLocation이 호출됩니다.
      await waitFor(() => expect(setActiveLocation).toHaveBeenCalledOnce());
    });

    test('카탈로그 미스 → not-found 반환', async () => {
      vi.mocked(getCatalogEntryById).mockReturnValue(null);
      vi.mocked(useActiveLocation).mockReturnValue(noCtx);
      vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
      vi.mocked(useAqi).mockReturnValue(pendingQuery());

      const { result } = renderHook(() => useDetailBootstrap('loc_unknown'));
      await waitFor(() => expect(result.current.kind).toBe('not-found'));
    });

    test('지오코딩 실패 → not-found 반환', async () => {
      vi.mocked(getCatalogEntryById).mockReturnValue({
        catalogLocationId: 'KR-Seoul',
        canonicalPath: '서울특별시',
        depth: 1,
        siDo: '서울특별시',
        leafLabel: '서울',
        tokens: ['서울특별시'],
        display: { primaryLabel: '서울', secondaryLabel: null },
        archetypeKey: null,
        overrideKey: null,
      });
      vi.mocked(createCatalogLocationResolver).mockReturnValue({
        resolveCatalogLocation: vi
          .fn()
          .mockRejectedValue(new Error('네트워크 오류')),
      });
      vi.mocked(useActiveLocation).mockReturnValue(noCtx);
      vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
      vi.mocked(useAqi).mockReturnValue(pendingQuery());

      const { result } = renderHook(() => useDetailBootstrap('loc_test'));
      await waitFor(() => expect(result.current.kind).toBe('not-found'));
    });

    test('unsupported 해결 결과 → not-found 반환', async () => {
      vi.mocked(getCatalogEntryById).mockReturnValue({
        catalogLocationId: 'KR-Seoul',
        canonicalPath: '서울특별시',
        depth: 1,
        siDo: '서울특별시',
        leafLabel: '서울',
        tokens: ['서울특별시'],
        display: { primaryLabel: '서울', secondaryLabel: null },
        archetypeKey: null,
        overrideKey: null,
      });
      // 기본 mock은 이미 unsupported를 반환합니다.
      vi.mocked(useActiveLocation).mockReturnValue(noCtx);
      vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
      vi.mocked(useAqi).mockReturnValue(pendingQuery());

      const { result } = renderHook(() => useDetailBootstrap('loc_test'));
      await waitFor(() => expect(result.current.kind).toBe('not-found'));
    });
  });
});
