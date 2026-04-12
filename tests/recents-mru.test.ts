// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { persistRecent } from '../frontend/features/recents';
import { createRecentsRepository } from '../frontend/shared/lib/storage/repositories/location-repositories';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';

function makeLocation(id: string): ResolvedLocation {
  return {
    kind: 'resolved',
    locationId: `loc_${id}`,
    catalogLocationId: id,
    name: `지역 ${id}`,
    admin1: '서울특별시',
    latitude: 37.5,
    longitude: 127.0,
    timezone: 'Asia/Seoul',
  };
}

afterEach(() => {
  localStorage.clear();
});

describe('persistRecent', () => {
  test('prepends a new location to an empty list', () => {
    const loc = makeLocation('aaa000000001');
    persistRecent(loc);

    const recents = createRecentsRepository().getAll();
    expect(recents).toHaveLength(1);
    expect(recents[0].location.locationId).toBe('loc_aaa000000001');
  });

  test('deduplicates: existing entry is removed and re-prepended', () => {
    const locA = makeLocation('aaa000000001');
    const locB = makeLocation('bbb000000002');
    persistRecent(locA);
    persistRecent(locB);
    persistRecent(locA); // move A to top

    const recents = createRecentsRepository().getAll();
    expect(recents).toHaveLength(2);
    expect(recents[0].location.locationId).toBe('loc_aaa000000001');
    expect(recents[1].location.locationId).toBe('loc_bbb000000002');
  });

  test('caps the list at 10 entries, dropping the oldest', () => {
    for (let i = 0; i < 11; i++) {
      persistRecent(makeLocation(String(i).padStart(12, '0')));
    }

    const recents = createRecentsRepository().getAll();
    expect(recents).toHaveLength(10);
    // The 11th (i=10) was last added, so it's at index 0; i=0 was dropped
    // Verify we have exactly 10 and the oldest was dropped
    const ids = recents.map((r) =>
      r.location.kind === 'resolved' ? r.location.catalogLocationId : null
    );
    expect(ids).not.toContain('000000000000'); // i=0 was dropped (oldest)
  });

  test('updates lastOpenedAt timestamp on re-insert', () => {
    const loc = makeLocation('aaa000000001');
    persistRecent(loc);
    const firstTime = createRecentsRepository().getAll()[0].lastOpenedAt;

    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    persistRecent(loc);
    vi.useRealTimers();

    const secondTime = createRecentsRepository().getAll()[0].lastOpenedAt;
    expect(secondTime > firstTime).toBe(true);
  });
});
