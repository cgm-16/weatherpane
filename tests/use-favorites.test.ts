// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';
import { useFavorites } from '../frontend/features/favorites/use-favorites';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';

const makeLocation = (id: string, index = 0): ResolvedLocation => ({
  kind: 'resolved',
  locationId: `loc_${id}`,
  catalogLocationId: id,
  name: `도시 ${id}`,
  admin1: '경기도',
  latitude: 37 + index * 0.1,
  longitude: 127 + index * 0.1,
  timezone: 'Asia/Seoul',
});

const seoul = makeLocation('KR-Seoul');
const busan = makeLocation('KR-Busan');

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // --- addFavorite ---

  test('addFavorite는 새 즐겨찾기를 추가하고 "added"를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    let ret: string;
    act(() => {
      ret = result.current.addFavorite(seoul);
    });
    expect(ret!).toBe('added');
    expect(result.current.isFavorite(seoul.locationId)).toBe(true);
  });

  test('addFavorite는 이미 추가된 위치에 대해 "duplicate"를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    let ret: string;
    act(() => {
      ret = result.current.addFavorite(seoul);
    });
    expect(ret!).toBe('duplicate');
    expect(result.current.favorites).toHaveLength(1);
  });

  test('addFavorite는 6개 초과 시 "max-reached"를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    const locs = Array.from({ length: 6 }, (_, i) =>
      makeLocation(`KR-City${i}`, i)
    );
    for (const loc of locs) {
      act(() => {
        result.current.addFavorite(loc);
      });
    }
    let ret: string;
    act(() => {
      ret = result.current.addFavorite(busan);
    });
    expect(ret!).toBe('max-reached');
    expect(result.current.favorites).toHaveLength(6);
  });

  test('6개 즐겨찾기가 가득 찼을 때 atMaxFavorites는 true다', () => {
    const { result } = renderHook(() => useFavorites());
    const locs = Array.from({ length: 6 }, (_, i) =>
      makeLocation(`KR-City${i}`, i)
    );
    for (const loc of locs) {
      act(() => {
        result.current.addFavorite(loc);
      });
    }
    expect(result.current.atMaxFavorites).toBe(true);
  });

  test('즐겨찾기는 리마운트 후에도 유지된다', () => {
    const { result, unmount } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    unmount();
    const { result: r2 } = renderHook(() => useFavorites());
    expect(r2.current.isFavorite(seoul.locationId)).toBe(true);
  });

  // --- removeFavorite ---

  test('removeFavorite는 즐겨찾기를 제거하고 "removed"를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    let ret: string;
    act(() => {
      ret = result.current.removeFavorite(seoul.locationId);
    });
    expect(ret!).toBe('removed');
    expect(result.current.isFavorite(seoul.locationId)).toBe(false);
  });

  test('removeFavorite는 없는 항목에 대해 "not-found"를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    let ret: string;
    act(() => {
      ret = result.current.removeFavorite('nonexistent');
    });
    expect(ret!).toBe('not-found');
  });

  test('removeFavorite는 favorites.v1 키만 수정하고 active-location.v1 키는 건드리지 않는다', () => {
    const activeKey = 'weatherpane.active-location.v1';
    const favKey = 'weatherpane.favorites.v1';
    const activeValue = JSON.stringify({ kind: 'resolved', location: seoul });
    localStorage.setItem(activeKey, activeValue);

    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });

    expect(localStorage.getItem(activeKey)).toBe(activeValue);
    const stored = JSON.parse(localStorage.getItem(favKey) ?? '{"data":[]}');
    expect(stored.data).toHaveLength(0);
  });

  // --- undo ---

  test('removeFavorite 후 undoEntry가 설정된다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });
    expect(result.current.undoEntry).not.toBeNull();
    expect(result.current.undoEntry?.removedItem.location.locationId).toBe(
      seoul.locationId
    );
  });

  test('undoRemove는 정확한 이전 상태(위치 및 닉네임 포함)를 복원한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.addFavorite(busan);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });
    expect(result.current.favorites).toHaveLength(1);
    act(() => {
      result.current.undoRemove();
    });
    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.isFavorite(seoul.locationId)).toBe(true);
    const restoredSeoul = result.current.favorites.find(
      (f) => f.location.locationId === seoul.locationId
    );
    expect(restoredSeoul?.order).toBe(0);
  });

  test('새 removeFavorite 호출은 이전 undo 항목을 교체한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.addFavorite(busan);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });
    act(() => {
      result.current.removeFavorite(busan.locationId);
    });
    expect(result.current.undoEntry?.removedItem.location.locationId).toBe(
      busan.locationId
    );
  });

  test('undoRemove 후 undoEntry가 null이 된다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });
    act(() => {
      result.current.undoRemove();
    });
    expect(result.current.undoEntry).toBeNull();
  });

  test('5초 후 undoEntry가 자동으로 만료된다', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.removeFavorite(seoul.locationId);
    });
    expect(result.current.undoEntry).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.undoEntry).toBeNull();
  });
});
