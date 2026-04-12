interface FavoriteUndoToastProps {
  locationName: string;
  onUndo: () => void;
}

// 즐겨찾기 제거 후 실행 취소 토스트. 5초 타이머는 useFavorites 훅이 관리한다.
export function FavoriteUndoToast({
  locationName,
  onUndo,
}: FavoriteUndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[--radius-md] bg-card px-5 py-3 shadow-[--shadow-float]"
    >
      <span className="font-body text-sm text-foreground">
        {locationName}이(가) 즐겨찾기에서 제거되었습니다
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded-[--radius-sm] bg-primary px-3 py-1 font-body text-sm font-semibold text-primary-foreground"
      >
        실행 취소
      </button>
    </div>
  );
}
