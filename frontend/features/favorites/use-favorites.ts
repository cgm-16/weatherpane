import { useState, useEffect } from 'react';
import { createFavoritesRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';

const MAX_FAVORITES = 6;

export type AddFavoriteResult = 'added' | 'duplicate' | 'max-reached';
export type RemoveFavoriteResult = 'removed' | 'not-found';

export interface UndoEntry {
  snapshot: FavoriteLocation[];
  removedItem: FavoriteLocation;
}

// 참고: 이 훅은 단일 인스턴스를 가정합니다. React 트리에 두 인스턴스가 동시에
// 마운트되면 각각의 useState가 독립적으로 동작하여 서로의 변경을 인식하지 못합니다.
// 현재 호출 지점(홈, 상세, 즐겨찾기)은 각각 다른 라우트에 마운트되므로 동시 충돌이 없습니다.
// 동시 마운트가 필요해지면 컨텍스트 또는 외부 상태로 교체해야 합니다.
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(() =>
    createFavoritesRepository().getAll()
  );
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);

  // 5초 후 undo 항목 만료
  useEffect(() => {
    if (!undoEntry) return;
    const timer = setTimeout(() => setUndoEntry(null), 5000);
    return () => clearTimeout(timer);
  }, [undoEntry]);

  function isFavorite(locationId: string): boolean {
    return favorites.some((f) => f.location.locationId === locationId);
  }

  function addFavorite(location: ResolvedLocation): AddFavoriteResult {
    if (favorites.some((f) => f.location.locationId === location.locationId)) {
      return 'duplicate';
    }
    if (favorites.length >= MAX_FAVORITES) {
      return 'max-reached';
    }

    const now = new Date().toISOString();
    const newFav: FavoriteLocation = {
      favoriteId: crypto.randomUUID(),
      location,
      nickname: null,
      order: favorites.length,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...favorites, newFav];
    createFavoritesRepository().replaceAll(next);
    setFavorites(next);
    return 'added';
  }

  function removeFavorite(locationId: string): RemoveFavoriteResult {
    const toRemove = favorites.find(
      (f) => f.location.locationId === locationId
    );
    if (!toRemove) return 'not-found';

    const updated = favorites
      .filter((f) => f.location.locationId !== locationId)
      .map((f, i) => ({ ...f, order: i }));
    createFavoritesRepository().replaceAll(updated);
    setFavorites(updated);
    setUndoEntry({ snapshot: favorites, removedItem: toRemove });
    return 'removed';
  }

  function undoRemove(): void {
    if (!undoEntry) return;
    createFavoritesRepository().replaceAll(undoEntry.snapshot);
    setFavorites(undoEntry.snapshot);
    setUndoEntry(null);
  }

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    undoEntry,
    undoRemove,
    atMaxFavorites: favorites.length >= MAX_FAVORITES,
  };
}
