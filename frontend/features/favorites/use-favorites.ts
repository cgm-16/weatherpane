import { useState } from 'react';
import { createFavoritesRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';

const MAX_FAVORITES = 6;

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
      repo.replaceAll([...current, newFav]);
    }

    setFavorites(createFavoritesRepository().getAll());
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    atMaxFavorites: favorites.length >= MAX_FAVORITES,
  };
}
