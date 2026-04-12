// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
vi.mock('../frontend/app/providers/app-providers', () => ({
  getConfigError: vi.fn(() => null),
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

import { useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { useCoreWeather } from '../frontend/features/weather-queries/use-core-weather';
import { useAqi } from '../frontend/features/weather-queries/use-aqi';
import { getConfigError } from '../frontend/app/providers/app-providers';
import {
  createWeatherSnapshotRepository,
  createAqiSnapshotRepository,
} from '../frontend/shared/lib/storage/repositories/snapshot-repositories';
import { useHomeBootstrap } from '../frontend/features/app-bootstrap/use-home-bootstrap';

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

const activeResolved = {
  kind: 'resolved' as const,
  location,
  source: 'search' as const,
  changedAt: '2026-04-12T10:00:00Z',
};

const noCtx = {
  activeLocation: null,
  setActiveLocation: vi.fn(),
  clearActiveLocation: vi.fn(),
};
const resolvedCtx = {
  activeLocation: activeResolved,
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConfigError).mockReturnValue(null);
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
});

describe('useHomeBootstrap', () => {
  test('activeLocation이 null이면 no-location을 반환한다', () => {
    vi.mocked(useActiveLocation).mockReturnValue(noCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('no-location');
  });

  test('activeLocation이 raw-gps이면 no-location을 반환한다', () => {
    vi.mocked(useActiveLocation).mockReturnValue({
      ...noCtx,
      activeLocation: {
        kind: 'raw-gps' as const,
        location: {
          kind: 'raw-gps' as const,
          locationId: 'gps_1',
          name: '현재 위치',
          latitude: 37,
          longitude: 127,
          capturedAt: '2026-04-12T10:00:00Z',
          fallbackReason: 'canonicalization-failed' as const,
        },
        source: 'current-location' as const,
        changedAt: '2026-04-12T10:00:00Z',
      },
    });
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('no-location');
  });

  test('getConfigError가 에러를 반환하면 config-error를 반환한다', () => {
    const err = {
      code: 'INVALID_PROVIDER_MODE' as const,
      field: 'VITE_WEATHER_PROVIDER_MODE',
      message: 'Not set',
    };
    vi.mocked(getConfigError).mockReturnValue(err);
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('config-error');
  });

  test('두 쿼리가 pending이면 loading을 반환한다', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('loading');
  });

  test('두 쿼리가 성공하면 data를 반환한다', () => {
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
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('data');
  });

  test('두 쿼리에 data가 있고 하나가 isFetching이면 isRefreshing: true를 반환한다', () => {
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
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather, true));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('data');
    if (result.current.kind === 'data') {
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.hasRefreshError).toBe(false);
    }
  });

  test('두 쿼리에 data가 있고 하나가 isError이며 isFetching이 아니면 hasRefreshError: true를 반환한다', () => {
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
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather));
    // AQI 쿼리: data는 있지만 갱신 실패 (백그라운드 리페치 오류)
    vi.mocked(useAqi).mockReturnValue({
      isPending: false,
      isLoading: false,
      isFetching: false,
      data: aqi,
      isError: true,
    } as unknown as ReturnType<typeof useAqi>);
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('data');
    if (result.current.kind === 'data') {
      expect(result.current.hasRefreshError).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
    }
  });

  test('fetch 실패 + 유효 스냅샷 → stale-fallback을 반환한다', () => {
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
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('stale-fallback');
  });

  test('fetch 실패 + 만료된 스냅샷 → recoverable-error를 반환한다', () => {
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
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('recoverable-error');
  });

  test('fetch 실패 + 스냅샷 없음 → recoverable-error를 반환한다', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('recoverable-error');
  });

  test('날씨 성공 + AQI 실패 + 유효 날씨 스냅샷 → stale-fallback을 반환한다', () => {
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
    vi.mocked(useCoreWeather).mockReturnValue(
      successQuery({
        locationId: 'loc_test',
        fetchedAt: fresh,
        observedAt: fresh,
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
      } as CoreWeather)
    );
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('stale-fallback');
  });

  test('날씨 성공 + AQI 실패 + 스냅샷 없음 → recoverable-error를 반환한다', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(
      successQuery({
        locationId: 'loc_test',
        fetchedAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
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
      } as CoreWeather)
    );
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useHomeBootstrap());
    expect(result.current.kind).toBe('recoverable-error');
  });
});
