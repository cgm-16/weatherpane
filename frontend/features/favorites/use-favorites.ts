import { useState } from 'react';
import { createFavoritesRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';

const MAX_FAVORITES = 6;

// 참고: 이 훅은 단일 인스턴스를 가정합니다. React 트리에 두 인스턴스가 동시에
// 마운트되면 각각의 useState가 독립적으로 동작하여 서로의 변경을 인식하지 못합니다.
// 즐겨찾기 페이지가 추가될 경우 컨텍스트 또는 외부 상태로 교체해야 합니다.
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(() =>
    createFavoritesRepository().getAll()
  );

  function isFavorite(locationId: string): boolean {
    return favorites.some((f) => f.location.locationId === locationId);
  }

  function toggleFavorite(location: ResolvedLocation): void {
    const repo = createFavoritesRepository();
    const current = repo.getAll();
    const existing = current.find(
      (f) => f.location.locationId === location.locationId
    );

    if (existing) {
      const updated = current
        .filter((f) => f.location.locationId !== location.locationId)
        .map((f, i) => ({ ...f, order: i }));
      repo.replaceAll(updated);
      setFavorites(updated);
    } else if (current.length < MAX_FAVORITES) {
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
    }
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    atMaxFavorites: favorites.length >= MAX_FAVORITES,
  };
}
