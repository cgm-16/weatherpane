// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as recentsModule from '../frontend/features/recents';
import {
  SketchManifestProvider,
  BASELINE_MANIFEST,
} from '../frontend/entities/asset';

const mockLocation = {
  kind: 'resolved' as const,
  locationId: 'loc_aaa000000001',
  catalogLocationId: 'aaa000000001',
  name: '청운동',
  admin1: '서울특별시',
  latitude: 37.5,
  longitude: 127.0,
  timezone: 'Asia/Seoul',
};

// 각 테스트가 원하는 bootstrap 결과를 주입할 수 있도록 변경 가능한 레퍼런스를 둔다.
let mockBootstrapResult: Record<string, unknown> = { kind: 'loading' };

vi.mock('../frontend/features/recents', () => ({
  persistRecent: vi.fn(),
}));
vi.mock('../frontend/features/app-bootstrap/use-detail-bootstrap', () => ({
  useDetailBootstrap: () => mockBootstrapResult,
}));
vi.mock('../frontend/features/weather-queries/use-weather-refresh', () => ({
  useWeatherRefresh: () => vi.fn(),
}));

beforeEach(() => {
  mockBootstrapResult = { kind: 'loading' };
  vi.mocked(recentsModule.persistRecent).mockClear();
});

describe('LocationPage — recents insertion on entry', () => {
  test('calls persistRecent when bootstrap reaches data state', async () => {
    mockBootstrapResult = {
      kind: 'data',
      location: mockLocation,
      weather: {
        current: {
          temperatureC: 17,
          condition: { text: '맑음', icon: '' },
          humidityPct: 50,
        },
        today: { maxC: 20, minC: 10 },
        hourly: [],
      },
      aqi: { summary: { aqi: 1, category: 'good' }, pollutants: {} },
      isRefreshing: false,
      hasRefreshError: false,
    };

    const { LocationPage } =
      await import('../frontend/pages/location/ui/location-page');

    render(
      <SketchManifestProvider manifest={BASELINE_MANIFEST}>
        <MemoryRouter>
          <LocationPage resolvedLocationId="aaa000000001" />
        </MemoryRouter>
      </SketchManifestProvider>
    );

    await waitFor(() => {
      expect(recentsModule.persistRecent).toHaveBeenCalledWith(mockLocation);
    });
    expect(recentsModule.persistRecent).toHaveBeenCalledTimes(1);
  });

  test('calls persistRecent when bootstrap reaches stale-fallback state', async () => {
    mockBootstrapResult = {
      kind: 'stale-fallback',
      location: mockLocation,
      weather: {
        temperatureC: 17,
        conditionText: '맑음',
        todayMaxC: 20,
        todayMinC: 10,
        fetchedAt: new Date(0).toISOString(),
      },
      aqi: null,
    };

    const { LocationPage } =
      await import('../frontend/pages/location/ui/location-page');

    render(
      <MemoryRouter>
        <LocationPage resolvedLocationId="aaa000000001" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(recentsModule.persistRecent).toHaveBeenCalledWith(mockLocation);
    });
    expect(recentsModule.persistRecent).toHaveBeenCalledTimes(1);
  });

  test('does NOT call persistRecent when bootstrap is loading', async () => {
    // mockBootstrapResult이 이미 beforeEach에서 { kind: 'loading' }으로 설정됨

    const { LocationPage } =
      await import('../frontend/pages/location/ui/location-page');

    render(
      <MemoryRouter>
        <LocationPage resolvedLocationId="aaa000000001" />
      </MemoryRouter>
    );

    // 비동기 이펙트가 안정화될 때까지 기다린 후 호출되지 않았음을 확인한다.
    await waitFor(() =>
      expect(recentsModule.persistRecent).not.toHaveBeenCalled()
    );
  });
});
