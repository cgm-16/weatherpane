// @vitest-environment jsdom
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
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

// home-dashboard.tsx / detail-dashboard.tsx의 즐겨찾기 토글 버튼과 동일한
// disabled 조건을 재현한다. storage 동기화 useEffect(패시브 이펙트)는 커밋과
// 별도 태스크로 스케줄되므로, act() 없이 mount한 직후 동기 클릭은 실제 브라우저에서
// hydration 커밋과 첫 effect flush 사이에 발생 가능한 클릭을 재현한다.
//
// isHydrated 가드가 없는 버전: 회귀 재현용.
function UnguardedFavoriteToggleButton({
  location,
}: {
  location: ResolvedLocation;
}) {
  const { isFavorite, addFavorite, removeFavorite, atMaxFavorites } =
    useFavorites();
  const favorited = isFavorite(location.locationId);
  return createElement('button', {
    disabled: !favorited && atMaxFavorites,
    onClick: () => {
      if (favorited) {
        removeFavorite(location.locationId);
      } else {
        addFavorite(location);
      }
    },
  });
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

  // act() 밖에서 createRoot로 마운트하면 storage 동기화 useEffect(패시브 이펙트)가
  // 즉시 flush되지 않는다. 실측 결과 초기 커밋은 매크로태스크 1틱 후에 DOM에 반영되고
  // 그 시점에는 아직 이펙트가 flush되지 않은 상태다 — 즉 "버튼이 상호작용 가능하지만
  // storage 동기화는 아직 끝나지 않은" 구간이 실제로 존재한다. 그 구간에 클릭해 재현한다.
  // act() 밖에서 렌더/클릭하면 React가 "not wrapped in act(...)" 경고를 남긴다 —
  // 실제 브라우저에는 없는, 이 재현 기법 특유의 예상된 경고이므로 조용히 삼키지 않고
  // 여기서 잡아 기대한 경고인지 확인한 뒤 복원한다.
  test('회귀 재현: isHydrated 가드가 없으면 storage 동기화 이전 클릭이 기존 즐겨찾기를 덮어쓴다', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
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
      {
        favoriteId: 'fav-b',
        location: busan,
        nickname: null,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const jeju = makeLocation('KR-Jeju', 2);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      createElement(UnguardedFavoriteToggleButton, { location: jeju })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    container.querySelector('button')!.click();

    const stored = createFavoritesRepository().getAll();
    expect(stored).toHaveLength(1);
    expect(stored[0].location.locationId).toBe(jeju.locationId);

    for (const call of consoleError.mock.calls) {
      expect(String(call[0])).toContain('not wrapped in act');
    }
    consoleError.mockRestore();
    root.unmount();
    document.body.removeChild(container);
  });

  // 위 재현 테스트가 보여주는 위험(대기 중인 storage 동기화 이전에 mutator가 실행되면
  // 안전한 초기값([])을 기준으로 기존 데이터를 덮어씀)은 정확히 언제 이펙트가
  // flush되는지에 좌우되므로, 실제 스케줄러 타이밍에 의존하는 테스트는 근본적으로
  // 비결정적이다(관찰 결과 같은 지연도 테스트 실행 순서에 따라 커밋/flush 타이밍이 달랐다).
  // 그 대신 방어책 자체 — 버튼이 hydrate되기 전에는 항상 비활성 상태라는 것 —
  // 을 renderToString으로 결정적으로 검증한다. disabled 엘리먼트는 클릭 이벤트를
  // 전혀 받지 않으므로(DOM 표준 동작), 초기 렌더가 항상 disabled임을 증명하면 위
  // 재현 시나리오의 클릭 자체가 실제 컴포넌트에서는 발생할 수 없음이 보장된다.
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
