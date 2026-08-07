// @vitest-environment jsdom
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';
import { useFavorites } from '../frontend/features/favorites/use-favorites';
import { createFavoritesRepository } from '../frontend/shared/lib/storage/repositories/location-repositories';
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

function FavoritesCountProbe() {
  const { favorites } = useFavorites();
  return createElement(
    'div',
    { 'data-testid': 'count' },
    String(favorites.length)
  );
}

function FavoritesHydrationProbe() {
  const { isHydrated } = useFavorites();
  return createElement(
    'div',
    { 'data-testid': 'hydrated' },
    String(isHydrated)
  );
}

// isHydrated 가드가 있는 버전: 실제 컴포넌트의 수정된 disabled 조건.
function FavoriteToggleButton({ location }: { location: ResolvedLocation }) {
  const {
    isFavorite,
    addFavorite,
    removeFavorite,
    atMaxFavorites,
    isHydrated,
  } = useFavorites();
  const favorited = isFavorite(location.locationId);
  return createElement('button', {
    disabled: !isHydrated || (!favorited && atMaxFavorites),
    onClick: () => {
      if (favorited) {
        removeFavorite(location.locationId);
      } else {
        addFavorite(location);
      }
    },
  });
}

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

  // --- SSR 하이드레이션 안전성 (#92) ---

  test('renderToString은 localStorage에 저장된 즐겨찾기가 있어도 항상 서버 안전 초기값([])을 렌더링한다', () => {
    const now = new Date().toISOString();
    createFavoritesRepository().replaceAll([
      {
        favoriteId: 'fav-1',
        location: seoul,
        nickname: null,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const html = renderToString(createElement(FavoritesCountProbe));

    expect(html).toContain('>0<');
  });

  test('useFavorites는 서버 렌더에서 isHydrated=false로 시작하고 마운트 후 true가 된다', () => {
    // 서버 렌더는 effect를 실행하지 않으므로 SSR 안전 초기값 false를 유지한다.
    const serverHtml = renderToString(createElement(FavoritesHydrationProbe));
    expect(serverHtml).toContain('>false<');
    // 클라이언트 마운트(mount effect flush) 후에는 true로 전환된다.
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isHydrated).toBe(true);
  });

  // #92의 위험: 대기 중인 storage 동기화(패시브 이펙트)가 끝나기 전에 mutator가
  // 실행되면 안전한 초기값([])을 기준으로 기존 즐겨찾기를 통째로 덮어쓴다.
  // 방어책은 버튼이 hydrate되기 전에는 항상 비활성 상태라는 것이다. disabled
  // 엘리먼트는 클릭 이벤트를 전혀 받지 않으므로(DOM 표준 동작), 서버 렌더가 항상
  // disabled임을 renderToString으로 증명하면 hydration 이전 클릭 자체가 실제
  // 컴포넌트에서는 발생할 수 없음이 보장된다.
  test('renderToString은 이미 즐겨찾기가 있고 추가 여유가 있어도 즐겨찾기 토글 버튼을 항상 비활성 상태로 렌더링한다', () => {
    const now = new Date().toISOString();
    createFavoritesRepository().replaceAll([
      {
        favoriteId: 'fav-a',
        location: seoul,
        nickname: null,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const jeju = makeLocation('KR-Jeju', 2);

    const html = renderToString(
      createElement(FavoriteToggleButton, { location: jeju })
    );

    expect(html).toContain('disabled=""');
  });
});
