import { useSyncExternalStore } from 'react';
import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';
import {
  favoritesStore,
  type AddFavoriteResult,
  type RemoveFavoriteResult,
  type UndoEntry,
} from './favorites-store';

export type {
  AddFavoriteResult,
  RemoveFavoriteResult,
  UndoEntry,
} from './favorites-store';

export function useFavorites(): {
  favorites: FavoriteLocation[];
  isHydrated: boolean;
  isFavorite: (locationId: string) => boolean;
  addFavorite: (location: ResolvedLocation) => AddFavoriteResult;
  removeFavorite: (locationId: string) => RemoveFavoriteResult;
  updateNickname: (favoriteId: string, nickname: string | null) => void;
  reorderFavorites: (reordered: FavoriteLocation[]) => void;
  undoEntry: UndoEntry | null;
  undoRemove: () => void;
  atMaxFavorites: boolean;
} {
  const { favorites, undoEntry, isHydrated } = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot
  );

  return {
    favorites,
    isHydrated,
    isFavorite: favoritesStore.isFavorite,
    addFavorite: favoritesStore.addFavorite,
    removeFavorite: favoritesStore.removeFavorite,
    updateNickname: favoritesStore.updateNickname,
    reorderFavorites: favoritesStore.reorderFavorites,
    undoEntry,
    undoRemove: favoritesStore.undoRemove,
    atMaxFavorites: favoritesStore.atMaxFavorites(),
  };
}
