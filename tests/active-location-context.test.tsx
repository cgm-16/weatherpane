// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ActiveLocationProvider, useActiveLocation } from '../frontend/features/app-bootstrap/active-location-context';
import { createActiveLocationRepository } from '../frontend/shared/lib/storage/repositories/location-repositories';
import { createMemoryStorage } from './storage/test-storage';

const resolvedLocation = {
  kind: 'resolved' as const,
  locationId: 'loc_test',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const activeLocation = {
  kind: 'resolved' as const,
  location: resolvedLocation,
  source: 'search' as const,
  changedAt: '2026-04-12T10:00:00Z',
};

function Consumer() {
  const { activeLocation: loc, setActiveLocation, clearActiveLocation } = useActiveLocation();
  return (
    <div>
      <span data-testid="loc">{loc ? loc.location.name : 'none'}</span>
      <button onClick={() => setActiveLocation(activeLocation)}>set</button>
      <button onClick={() => clearActiveLocation()}>clear</button>
    </div>
  );
}

describe('ActiveLocationContext', () => {
  test('저장된 activeLocation이 없으면 null을 반환한다', () => {
    const storage = createMemoryStorage();
    render(
      <ActiveLocationProvider storage={storage}>
        <Consumer />
      </ActiveLocationProvider>
    );
    expect(screen.getByTestId('loc').textContent).toBe('none');
  });

  test('저장된 activeLocation이 있으면 초기값으로 복원한다', () => {
    const storage = createMemoryStorage();
    createActiveLocationRepository({ storage }).set(activeLocation);
    render(
      <ActiveLocationProvider storage={storage}>
        <Consumer />
      </ActiveLocationProvider>
    );
    expect(screen.getByTestId('loc').textContent).toBe('서울');
  });

  test('setActiveLocation은 상태와 storage를 모두 업데이트한다', async () => {
    const storage = createMemoryStorage();
    const user = userEvent.setup();
    render(
      <ActiveLocationProvider storage={storage}>
        <Consumer />
      </ActiveLocationProvider>
    );
    await user.click(screen.getByText('set'));
    expect(screen.getByTestId('loc').textContent).toBe('서울');
    expect(createActiveLocationRepository({ storage }).get()).toEqual(activeLocation);
  });

  test('clearActiveLocation은 상태와 storage를 모두 지운다', async () => {
    const storage = createMemoryStorage();
    createActiveLocationRepository({ storage }).set(activeLocation);
    const user = userEvent.setup();
    render(
      <ActiveLocationProvider storage={storage}>
        <Consumer />
      </ActiveLocationProvider>
    );
    await user.click(screen.getByText('clear'));
    expect(screen.getByTestId('loc').textContent).toBe('none');
    expect(createActiveLocationRepository({ storage }).get()).toBeNull();
  });
});
