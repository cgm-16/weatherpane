import { useState, useRef } from 'react';
import {
  useFavorites,
  FavoriteUndoToast,
  useRefreshQueue,
} from '~/features/favorites';
import { FavoriteCard } from './favorite-card';
import { FavoritesEmptyState } from './favorites-empty-state';
import type { FavoriteLocation } from '~/entities/location/model/types';

export function FavoritesPage() {
  const { favorites, undoEntry, undoRemove, updateNickname, reorderFavorites } =
    useFavorites();
  useRefreshQueue(favorites);
  const [isEditMode, setIsEditMode] = useState(false);
  const draggedIdRef = useRef<string | null>(null);

  function handleEnterEdit() {
    setIsEditMode(true);
  }

  function handleExitEdit() {
    // 활성화된 닉네임 인풋이 있으면 blur → onBlur 핸들러에서 commit이 먼저 실행됨
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsEditMode(false);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next: FavoriteLocation[] = [...favorites];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    reorderFavorites(next.map((f, i) => ({ ...f, order: i })));
  }

  function handleMoveDown(index: number) {
    if (index === favorites.length - 1) return;
    const next: FavoriteLocation[] = [...favorites];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    reorderFavorites(next.map((f, i) => ({ ...f, order: i })));
  }

  function handleDrop(targetId: string) {
    const fromId = draggedIdRef.current;
    if (!fromId || fromId === targetId) return;
    const from = favorites.findIndex((f) => f.favoriteId === fromId);
    const to = favorites.findIndex((f) => f.favoriteId === targetId);
    if (from === -1 || to === -1) return;
    const next = [...favorites];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderFavorites(next.map((f, i) => ({ ...f, order: i })));
    draggedIdRef.current = null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-32">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-headline mb-2 text-5xl font-extrabold tracking-tighter text-foreground">
              저장된 장소
            </h1>
            <p className="font-body font-medium text-muted-foreground opacity-70">
              자주 확인하는 장소를 한눈에.
            </p>
          </div>
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={isEditMode ? handleExitEdit : handleEnterEdit}
              className="mt-1 shrink-0 rounded-full bg-primary/10 px-4 py-1.5 font-body text-sm font-bold text-primary transition-colors hover:bg-primary/20 active:scale-95"
            >
              {isEditMode ? '완료' : '편집'}
            </button>
          )}
        </header>

        {favorites.length === 0 ? (
          <FavoritesEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav, i) => (
              <div
                key={fav.favoriteId}
                draggable={isEditMode}
                onDragStart={() => {
                  draggedIdRef.current = fav.favoriteId;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={() => handleDrop(fav.favoriteId)}
                onDragEnd={() => {
                  draggedIdRef.current = null;
                }}
              >
                <FavoriteCard
                  favorite={fav}
                  editProps={
                    isEditMode
                      ? {
                          isFirst: i === 0,
                          isLast: i === favorites.length - 1,
                          onMoveUp: () => handleMoveUp(i),
                          onMoveDown: () => handleMoveDown(i),
                          onNicknameCommit: (nick) =>
                            updateNickname(fav.favoriteId, nick),
                        }
                      : undefined
                  }
                />
              </div>
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
