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
  // 편집 모드에서 순서 변경을 로컬에 보관하다가 "완료" 시점에 한 번만 저장한다
  const [draftFavorites, setDraftFavorites] =
    useState<FavoriteLocation[]>(favorites);
  const draggedIdRef = useRef<string | null>(null);

  function handleEnterEdit() {
    setDraftFavorites(favorites);
    setIsEditMode(true);
  }

  function handleExitEdit() {
    // 활성화된 닉네임 인풋이 있으면 blur → onBlur 핸들러에서 commit이 먼저 실행됨
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    reorderFavorites(draftFavorites);
    setIsEditMode(false);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next: FavoriteLocation[] = [...draftFavorites];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setDraftFavorites(next.map((f, i) => ({ ...f, order: i })));
  }

  function handleMoveDown(index: number) {
    if (index === draftFavorites.length - 1) return;
    const next: FavoriteLocation[] = [...draftFavorites];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setDraftFavorites(next.map((f, i) => ({ ...f, order: i })));
  }

  function handleDrop(targetId: string) {
    const fromId = draggedIdRef.current;
    if (!fromId || fromId === targetId) return;
    const from = draftFavorites.findIndex((f) => f.favoriteId === fromId);
    const to = draftFavorites.findIndex((f) => f.favoriteId === targetId);
    if (from === -1 || to === -1) return;
    const next = [...draftFavorites];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraftFavorites(next.map((f, i) => ({ ...f, order: i })));
    draggedIdRef.current = null;
  }

  const displayFavorites = isEditMode ? draftFavorites : favorites;

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
            {displayFavorites.map((fav, i) => (
              <div
                key={fav.favoriteId}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={() => handleDrop(fav.favoriteId)}
              >
                <FavoriteCard
                  favorite={fav}
                  editProps={
                    isEditMode
                      ? {
                          isFirst: i === 0,
                          isLast: i === displayFavorites.length - 1,
                          onMoveUp: () => handleMoveUp(i),
                          onMoveDown: () => handleMoveDown(i),
                          onNicknameCommit: (nick) => {
                            updateNickname(fav.favoriteId, nick);
                            setDraftFavorites((prev) =>
                              prev.map((d) =>
                                d.favoriteId === fav.favoriteId
                                  ? { ...d, nickname: nick }
                                  : d
                              )
                            );
                          },
                          onDragStart: () => {
                            draggedIdRef.current = fav.favoriteId;
                          },
                          onDragEnd: () => {
                            draggedIdRef.current = null;
                          },
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
