// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, beforeEach, vi } from 'vitest';
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

const seoul = makeLocation('KR-Seoul', 0);
const busan = makeLocation('KR-Busan', 1);
const jeju = makeLocation('KR-Jeju', 2);

describe('useFavorites — updateNickname', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('updateNickname sets a nickname on a matching favorite', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    const id = result.current.favorites[0].favoriteId;
    act(() => {
      result.current.updateNickname(id, '집');
    });
    expect(result.current.favorites[0].nickname).toBe('집');
  });

  test('updateNickname accepts null to clear nickname', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    const id = result.current.favorites[0].favoriteId;
    act(() => {
      result.current.updateNickname(id, '집');
    });
    act(() => {
      result.current.updateNickname(id, null);
    });
    expect(result.current.favorites[0].nickname).toBeNull();
  });

  test('updateNickname does nothing when favoriteId not found', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.updateNickname('unknown-id', '테스트');
    });
    expect(result.current.favorites[0].nickname).toBeNull();
  });

  test('updateNickname persists across remount', () => {
    const { result, unmount } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    const id = result.current.favorites[0].favoriteId;
    act(() => {
      result.current.updateNickname(id, '홈');
    });
    unmount();
    const { result: r2 } = renderHook(() => useFavorites());
    expect(r2.current.favorites[0].nickname).toBe('홈');
  });

  test('updateNickname updates updatedAt timestamp', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useFavorites());
      act(() => {
        result.current.addFavorite(seoul);
      });
      const before = result.current.favorites[0].updatedAt;
      const id = result.current.favorites[0].favoriteId;
      vi.advanceTimersByTime(1);
      act(() => {
        result.current.updateNickname(id, '새이름');
      });
      expect(result.current.favorites[0].updatedAt).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useFavorites — reorderFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('reorderFavorites replaces favorites list with new order', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.addFavorite(busan);
    });
    act(() => {
      result.current.addFavorite(jeju);
    });
    const [s, b, j] = result.current.favorites;
    const reordered = [j, s, b].map((f, i) => ({ ...f, order: i }));
    act(() => {
      result.current.reorderFavorites(reordered);
    });
    expect(result.current.favorites[0].location.locationId).toBe(
      jeju.locationId
    );
    expect(result.current.favorites[1].location.locationId).toBe(
      seoul.locationId
    );
    expect(result.current.favorites[2].location.locationId).toBe(
      busan.locationId
    );
  });

  test('reorderFavorites assigns updated order values', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.addFavorite(busan);
    });
    const [s, b] = result.current.favorites;
    act(() => {
      result.current.reorderFavorites([
        { ...b, order: 0 },
        { ...s, order: 1 },
      ]);
    });
    expect(result.current.favorites[0].order).toBe(0);
    expect(result.current.favorites[1].order).toBe(1);
  });

  test('reorderFavorites persists across remount', () => {
    const { result, unmount } = renderHook(() => useFavorites());
    act(() => {
      result.current.addFavorite(seoul);
    });
    act(() => {
      result.current.addFavorite(busan);
    });
    const [s, b] = result.current.favorites;
    act(() => {
      result.current.reorderFavorites([
        { ...b, order: 0 },
        { ...s, order: 1 },
      ]);
    });
    unmount();
    const { result: r2 } = renderHook(() => useFavorites());
    expect(r2.current.favorites[0].location.locationId).toBe(busan.locationId);
  });
});
