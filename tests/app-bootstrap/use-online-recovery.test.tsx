// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('~/features/app-bootstrap/active-location-context', () => ({
  useActiveLocation: vi.fn(),
}));
vi.mock('~/features/weather-queries/refresh-location', () => ({
  refreshLocation: vi.fn().mockResolvedValue(undefined),
}));

import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import { refreshLocation } from '~/features/weather-queries/refresh-location';
import { useOnlineRecovery } from '~/features/app-bootstrap/use-online-recovery';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const resolvedLocation = {
  kind: 'resolved' as const,
  location: {
    kind: 'resolved' as const,
    locationId: 'loc_test',
    catalogLocationId: 'KR-Seoul',
    name: '서울',
    admin1: '서울특별시',
    latitude: 37.56,
    longitude: 126.97,
    timezone: 'Asia/Seoul',
  },
  source: 'search' as const,
  changedAt: '2026-04-13T00:00:00Z',
};

describe('useOnlineRecovery', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.mocked(refreshLocation).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('온라인 상태로 시작하면 refetch를 트리거하지 않는다', () => {
    vi.mocked(useActiveLocation).mockReturnValue({
      activeLocation: resolvedLocation,
      setActiveLocation: vi.fn(),
      clearActiveLocation: vi.fn(),
    });
    renderHook(() => useOnlineRecovery(), { wrapper });
    expect(refreshLocation).not.toHaveBeenCalled();
  });

  it('offline→online 전환 시 활성 위치의 쿼리를 갱신한다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    vi.mocked(useActiveLocation).mockReturnValue({
      activeLocation: resolvedLocation,
      setActiveLocation: vi.fn(),
      clearActiveLocation: vi.fn(),
    });
    renderHook(() => useOnlineRecovery(), { wrapper });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(refreshLocation).toHaveBeenCalledWith(
      expect.any(Object),
      'loc_test'
    );
  });

  it('활성 위치가 없을 때 online 이벤트를 무시한다', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    vi.mocked(useActiveLocation).mockReturnValue({
      activeLocation: null,
      setActiveLocation: vi.fn(),
      clearActiveLocation: vi.fn(),
    });
    renderHook(() => useOnlineRecovery(), { wrapper });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(refreshLocation).not.toHaveBeenCalled();
  });
});
