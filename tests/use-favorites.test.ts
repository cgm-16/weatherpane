// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, beforeEach } from 'vitest';
import { useFavorites } from '../frontend/features/favorites/use-favorites';
import type { ResolvedLocation } from '../frontend/entities/location/model/types';

const seoulLocation: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_seoul',
  catalogLocationId: 'KR-Seoul',
  name: '서울',
  admin1: '서울특별시',
  latitude: 37.56,
  longitude: 126.97,
  timezone: 'Asia/Seoul',
};

const busanLocation: ResolvedLocation = {
  kind: 'resolved',
  locationId: 'loc_busan',
  catalogLocationId: 'KR-Busan',
  name: '부산',
  admin1: '부산광역시',
  latitude: 35.18,
  longitude: 129.07,
  timezone: 'Asia/Seoul',
};

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('초기 상태에서 isFavorite는 false를 반환한다', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite(seoulLocation.locationId)).toBe(false);
  });

  test('toggleFavorite는 즐겨찾기를 추가한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite(seoulLocation);
    });
    expect(result.current.isFavorite(seoulLocation.locationId)).toBe(true);
  });

  test('toggleFavorite는 기존 즐겨찾기를 제거한다', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite(seoulLocation);
    });
    act(() => {
      result.current.toggleFavorite(seoulLocation);
    });
    expect(result.current.isFavorite(seoulLocation.locationId)).toBe(false);
  });

  test('6개 즐겨찾기가 가득 찼을 때 atMaxFavorites는 true다', () => {
    const { result } = renderHook(() => useFavorites());
    const locations = Array.from(
      { length: 6 },
      (_, i): ResolvedLocation => ({
        kind: 'resolved',
        locationId: `loc_${i}`,
        catalogLocationId: `KR-City${i}`,
        name: `도시${i}`,
        admin1: '경기도',
        latitude: 37 + i * 0.1,
        longitude: 127 + i * 0.1,
        timezone: 'Asia/Seoul',
      })
    );
    for (const loc of locations) {
      act(() => {
        result.current.toggleFavorite(loc);
      });
    }
    expect(result.current.atMaxFavorites).toBe(true);
  });

  test('즐겨찾기는 리마운트 후에도 유지된다', () => {
    const { result, unmount } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite(seoulLocation);
    });
    unmount();
    const { result: result2 } = renderHook(() => useFavorites());
    expect(result2.current.isFavorite(seoulLocation.locationId)).toBe(true);
  });

  test('즐겨찾기가 가득 찬 경우 추가 toggleFavorite는 무시된다', () => {
    const { result } = renderHook(() => useFavorites());
    const locations = Array.from(
      { length: 6 },
      (_, i): ResolvedLocation => ({
        kind: 'resolved',
        locationId: `loc_${i}`,
        catalogLocationId: `KR-City${i}`,
        name: `도시${i}`,
        admin1: '경기도',
        latitude: 37 + i * 0.1,
        longitude: 127 + i * 0.1,
        timezone: 'Asia/Seoul',
      })
    );
    for (const loc of locations) {
      act(() => {
        result.current.toggleFavorite(loc);
      });
    }
    act(() => {
      result.current.toggleFavorite(busanLocation);
    });
    expect(result.current.isFavorite(busanLocation.locationId)).toBe(false);
    expect(result.current.favorites).toHaveLength(6);
  });
});
