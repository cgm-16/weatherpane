import { useFavorites } from '~/features/favorites';
import { FavoriteUndoToast } from '~/features/favorites';
import { useRefreshQueue } from '~/features/favorites/use-refresh-queue';
import { FavoriteCard } from './favorite-card';
import { FavoritesEmptyState } from './favorites-empty-state';

export function FavoritesPage() {
  const { favorites, undoEntry, undoRemove } = useFavorites();
  useRefreshQueue(favorites);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-32">
        <header className="mb-10">
          <h1 className="font-headline mb-2 text-5xl font-extrabold tracking-tighter text-foreground">
            Saved Places
          </h1>
          <p className="font-body font-medium text-muted-foreground opacity-70">
            자주 확인하는 장소를 한눈에.
          </p>
        </header>

        {favorites.length === 0 ? (
          <FavoritesEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <FavoriteCard key={fav.favoriteId} favorite={fav} />
            ))}
          </div>
        )}
      </div>

      {undoEntry && (
        <FavoriteUndoToast
          locationName={
            undoEntry.removedItem.nickname ??
            undoEntry.removedItem.location.name
          }
          onUndo={undoRemove}
        />
      )}
    </div>
  );
}
