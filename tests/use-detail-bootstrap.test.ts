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
import {
  createWeatherSnapshotRepository,
  createAqiSnapshotRepository,
} from '../frontend/shared/lib/storage/repositories/snapshot-repositories';
import { useDetailBootstrap } from '../frontend/features/app-bootstrap/use-detail-bootstrap';

const location = {
  kind: 'resolved' as const,
  locationId: 'loc_KR-Seoul',
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
  locationId: 'loc_KR-Seoul',
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
  locationId: 'loc_KR-Seoul',
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

  test('활성 위치 없음 → not-found 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(noCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('not-found');
  });

  test('활성 위치가 catalogLocationId와 불일치 → not-found 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useDetailBootstrap('KR-Busan'));
    expect(result.current.kind).toBe('not-found');
  });

  test('쿼리 로딩 중 → loading 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(pendingQuery());
    vi.mocked(useAqi).mockReturnValue(pendingQuery());
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('loading');
  });

  test('두 쿼리 성공 → data 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('data');
  });

  test('data + 하나가 isFetching → isRefreshing: true', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(successQuery(weather, true));
    vi.mocked(useAqi).mockReturnValue(successQuery(aqi));
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('data');
    if (result.current.kind === 'data') {
      expect(result.current.isRefreshing).toBe(true);
    }
  });

  test('fetch 실패 + 유효 스냅샷 → stale-fallback 반환', () => {
    const fresh = new Date(Date.now() - 60_000).toISOString();
    const ws = {
      locationId: 'loc_KR-Seoul',
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
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('stale-fallback');
  });

  test('fetch 실패 + 만료된 스냅샷 → recoverable-error 반환', () => {
    const stale = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const ws = {
      locationId: 'loc_KR-Seoul',
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
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('recoverable-error');
  });

  test('fetch 실패 + 스냅샷 없음 → recoverable-error 반환', () => {
    vi.mocked(useActiveLocation).mockReturnValue(resolvedCtx);
    vi.mocked(useCoreWeather).mockReturnValue(errorQuery());
    vi.mocked(useAqi).mockReturnValue(errorQuery());
    const { result } = renderHook(() => useDetailBootstrap('KR-Seoul'));
    expect(result.current.kind).toBe('recoverable-error');
  });
});
