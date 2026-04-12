// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi, beforeEach } from 'vitest';

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
let mockBootstrapResult: Record<string, unknown> = {};

vi.mock('../frontend/features/app-bootstrap/use-detail-bootstrap', () => ({
  useDetailBootstrap: () => mockBootstrapResult,
}));
vi.mock('../frontend/features/weather-queries/use-weather-refresh', () => ({
  useWeatherRefresh: () => vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
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

    const recentsModule = await import('../frontend/features/recents');
    const spy = vi.spyOn(recentsModule, 'persistRecent');

    const { LocationPage } =
      await import('../frontend/pages/location/ui/location-page');

    render(
      <MemoryRouter>
        <LocationPage resolvedLocationId="aaa000000001" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(mockLocation);
    });
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

    const recentsModule = await import('../frontend/features/recents');
    const spy = vi.spyOn(recentsModule, 'persistRecent');

    const { LocationPage } =
      await import('../frontend/pages/location/ui/location-page');

    render(
      <MemoryRouter>
        <LocationPage resolvedLocationId="aaa000000001" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(mockLocation);
    });
  });
});
