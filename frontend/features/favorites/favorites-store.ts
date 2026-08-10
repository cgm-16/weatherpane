import type {
  FavoriteLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';
import { createFavoritesRepository } from '~/shared/lib/storage/repositories/location-repositories';

const MAX_FAVORITES = 6;
const UNDO_EXPIRY_MS = 5000;

export type AddFavoriteResult = 'added' | 'duplicate' | 'max-reached';
export type RemoveFavoriteResult = 'removed' | 'not-found';

export interface UndoEntry {
  snapshot: FavoriteLocation[];
  removedItem: FavoriteLocation;
}

export interface FavoritesSnapshot {
  favorites: FavoriteLocation[];
  undoEntry: UndoEntry | null;
  isHydrated: boolean;
}

export interface FavoritesStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): FavoritesSnapshot;
  getServerSnapshot(): FavoritesSnapshot;
  isFavorite(locationId: string): boolean;
  atMaxFavorites(): boolean;
  addFavorite(location: ResolvedLocation): AddFavoriteResult;
  removeFavorite(locationId: string): RemoveFavoriteResult;
  undoRemove(): void;
  updateNickname(favoriteId: string, nickname: string | null): void;
  reorderFavorites(reordered: FavoriteLocation[]): void;
}

interface Subscription {
  listener: () => void;
}

const repository = createFavoritesRepository();
const serverSnapshot: FavoritesSnapshot = {
  favorites: [],
  undoEntry: null,
  isHydrated: false,
};
const subscriptions = new Set<Subscription>();

let snapshot = serverSnapshot;
let undoTimer: ReturnType<typeof setTimeout> | null = null;
let runtimeGeneration = 0;

function notifySubscribers(): void {
  subscriptions.forEach(({ listener }) => listener());
}

function publish(nextSnapshot: FavoritesSnapshot): void {
  snapshot = nextSnapshot;
  notifySubscribers();
}

function clearUndoTimer(): void {
  if (undoTimer === null) return;

  clearTimeout(undoTimer);
  undoTimer = null;
}

function scheduleUndoExpiry(): void {
  clearUndoTimer();
  const generation = runtimeGeneration;
  const timer = setTimeout(() => {
    if (undoTimer !== timer || runtimeGeneration !== generation) return;

    undoTimer = null;
    publish({ ...snapshot, undoEntry: null });
  }, UNDO_EXPIRY_MS);
  undoTimer = timer;
}

function hydrate(): void {
  publish({
    favorites: repository.getAll(),
    undoEntry: null,
    isHydrated: true,
  });
}

function releaseRuntimeState(): void {
  runtimeGeneration += 1;
  clearUndoTimer();
  snapshot = serverSnapshot;
}

function subscribe(listener: () => void): () => void {
  const subscription = { listener };
  const isFirstSubscriber = subscriptions.size === 0;
  subscriptions.add(subscription);

  if (isFirstSubscriber) {
    hydrate();
  }

  let isSubscribed = true;

  return () => {
    if (!isSubscribed) return;

    isSubscribed = false;
    subscriptions.delete(subscription);
    if (subscriptions.size === 0) {
      releaseRuntimeState();
    }
  };
}

function getSnapshot(): FavoritesSnapshot {
  return snapshot;
}

function getServerSnapshot(): FavoritesSnapshot {
  return serverSnapshot;
}

function isFavorite(locationId: string): boolean {
  return snapshot.favorites.some(
    (favorite) => favorite.location.locationId === locationId
  );
}

function atMaxFavorites(): boolean {
  return snapshot.favorites.length >= MAX_FAVORITES;
}

function addFavorite(location: ResolvedLocation): AddFavoriteResult {
  const favorites = snapshot.favorites;
  if (
    favorites.some(
      (favorite) => favorite.location.locationId === location.locationId
    )
  ) {
    return 'duplicate';
  }
  if (favorites.length >= MAX_FAVORITES) {
    return 'max-reached';
  }

  const now = new Date().toISOString();
  const next = [
    ...favorites,
    {
      favoriteId: crypto.randomUUID(),
      location,
      nickname: null,
      order: favorites.length,
      createdAt: now,
      updatedAt: now,
    },
  ];
  repository.replaceAll(next);
  publish({ ...snapshot, favorites: next });
  return 'added';
}

function removeFavorite(locationId: string): RemoveFavoriteResult {
  const favorites = snapshot.favorites;
  const removedItem = favorites.find(
    (favorite) => favorite.location.locationId === locationId
  );
  if (!removedItem) return 'not-found';

  const next = favorites
    .filter((favorite) => favorite.location.locationId !== locationId)
    .map((favorite, order) => ({ ...favorite, order }));
  const undoEntry = { snapshot: favorites, removedItem };

  clearUndoTimer();
  repository.replaceAll(next);
  publish({ ...snapshot, favorites: next, undoEntry });
  scheduleUndoExpiry();
  return 'removed';
}

function undoRemove(): void {
  const undoEntry = snapshot.undoEntry;
  if (!undoEntry) return;

  clearUndoTimer();
  repository.replaceAll(undoEntry.snapshot);
  publish({
    ...snapshot,
    favorites: undoEntry.snapshot,
    undoEntry: null,
  });
}

function updateNickname(favoriteId: string, nickname: string | null): void {
  const trimmed = nickname?.trim().slice(0, 20) ?? null;
  const normalized = trimmed && trimmed.length > 0 ? trimmed : null;
  const now = new Date().toISOString();
  const next = snapshot.favorites.map((favorite) =>
    favorite.favoriteId === favoriteId
      ? { ...favorite, nickname: normalized, updatedAt: now }
      : favorite
  );

  repository.replaceAll(next);
  publish({ ...snapshot, favorites: next });
}

function reorderFavorites(reordered: FavoriteLocation[]): void {
  repository.replaceAll(reordered);
  publish({ ...snapshot, favorites: reordered });
}

export const favoritesStore: FavoritesStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  isFavorite,
  atMaxFavorites,
  addFavorite,
  removeFavorite,
  undoRemove,
  updateNickname,
  reorderFavorites,
};
