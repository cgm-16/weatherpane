import { useState, useEffect } from 'react';
import { createFavoritesRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';

const MAX_FAVORITES = 6;

export type AddFavoriteResult = 'added' | 'duplicate' | 'max-reached';
export type RemoveFavoriteResult = 'removed' | 'not-found';

interface UndoEntry {
  snapshot: FavoriteLocation[];
  removedItem: FavoriteLocation;
}

// 참고: 이 훅은 단일 인스턴스를 가정합니다. React 트리에 두 인스턴스가 동시에
// 마운트되면 각각의 useState가 독립적으로 동작하여 서로의 변경을 인식하지 못합니다.
// 즐겨찾기 페이지가 추가될 경우 컨텍스트 또는 외부 상태로 교체해야 합니다.
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
    const repo = createFavoritesRepository();
    const current = repo.getAll();

    if (current.some((f) => f.location.locationId === location.locationId)) {
      return 'duplicate';
    }
    if (current.length >= MAX_FAVORITES) {
      return 'max-reached';
    }

    const now = new Date().toISOString();
    const newFav: FavoriteLocation = {
      favoriteId: crypto.randomUUID(),
      location,
      nickname: null,
      order: current.length,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...current, newFav];
    repo.replaceAll(next);
    setFavorites(next);
    return 'added';
  }

  function removeFavorite(locationId: string): RemoveFavoriteResult {
    const repo = createFavoritesRepository();
    const current = repo.getAll();
    const toRemove = current.find((f) => f.location.locationId === locationId);

    if (!toRemove) return 'not-found';

    const updated = current
      .filter((f) => f.location.locationId !== locationId)
      .map((f, i) => ({ ...f, order: i }));
    repo.replaceAll(updated);
    setFavorites(updated);
    setUndoEntry({ snapshot: current, removedItem: toRemove });
    return 'removed';
  }

  function undoRemove(): void {
    if (!undoEntry) return;
    const repo = createFavoritesRepository();
    repo.replaceAll(undoEntry.snapshot);
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
