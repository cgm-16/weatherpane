// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import * as recentsModule from '../frontend/features/recents';
import { HomeDashboard } from '../frontend/pages/home/ui/home-dashboard';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';
import type { CoreWeather } from '../frontend/entities/weather/model/core-weather';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';

vi.mock('../frontend/features/favorites/use-favorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    isFavorite: vi.fn(() => false),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    undoEntry: null,
    undoRemove: vi.fn(),
    atMaxFavorites: false,
    updateNickname: vi.fn(),
    reorderFavorites: vi.fn(),
  })),
}));

const mockLocation: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_aaa000000001',
  catalogLocationId: 'aaa000000001',
  name: '역삼동',
  admin1: '서울특별시',
  admin2: '강남구',
  latitude: 37.5,
  longitude: 127.0,
  timezone: 'Asia/Seoul',
};

const condition = {
  code: 'CLEAR',
  text: '맑음',
  isDay: true,
  visualBucket: 'clear' as const,
  textMapping: {
    conditionCode: 'CLEAR',
    isDay: true,
    precipitationKind: 'none' as const,
    cloudCoverPct: 0,
    intensity: 'none' as const,
  },
};

const mockWeather: CoreWeather = {
  locationId: 'loc_aaa000000001',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  current: { temperatureC: 20, condition, humidityPct: 50 },
  today: { maxC: 25, minC: 15 },
  hourly: [],
  source: { provider: 'mock' },
};

const mockAqi: Aqi = {
  locationId: 'loc_aaa000000001',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock' },
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('HomeDashboard — recents insertion', () => {
  test('calls persistRecent on refresh button click', async () => {
    const spy = vi.spyOn(recentsModule, 'persistRecent');
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HomeDashboard
          location={mockLocation}
          weather={mockWeather}
          aqi={mockAqi}
          isRefreshing={false}
          hasRefreshError={false}
          onRefresh={vi.fn()}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '새로고침' }));

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(mockLocation);
  });

  test('calls persistRecent on favorite toggle click', async () => {
    const spy = vi.spyOn(recentsModule, 'persistRecent');
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HomeDashboard
          location={mockLocation}
          weather={mockWeather}
          aqi={mockAqi}
          isRefreshing={false}
          hasRefreshError={false}
          onRefresh={vi.fn()}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '즐겨찾기 추가' }));

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(mockLocation);
  });
});
