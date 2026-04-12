// 연결 오류 화면입니다. 스냅샷 없이 fetch 실패 시 표시됩니다.
interface HomeConnectionErrorProps {
  onRetry: () => void;
  // WP-017 즐겨찾기 구현 전까지는 전달하지 않으면 버튼을 숨깁니다.
  onGoToSavedPlaces?: () => void;
}

export function HomeConnectionError({ onRetry, onGoToSavedPlaces }: HomeConnectionErrorProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background" role="main">
      <div className="w-full max-w-md rounded-lg bg-surface-container-highest/50 p-8 backdrop-blur-[20px] flex flex-col items-center text-center">
        {/* 오프라인 표시 */}
        <div className="mb-10 flex items-center gap-2 rounded-full bg-surface-container-high/40 px-4 py-2 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-outline-variant" />
          <span className="font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Offline Mode Active
          </span>
        </div>

        {/* 아이콘 */}
        <div className="relative mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <span
              className="material-symbols-outlined text-5xl text-primary"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
            >
              signal_disconnected
            </span>
          </div>
          <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg">
            <span
              className="material-symbols-outlined text-xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>
        </div>

        <h2 className="font-headline mb-4 text-3xl font-extrabold leading-tight text-on-surface">
          Connection Interrupted
        </h2>
        <p className="font-body mb-10 px-2 text-base leading-relaxed text-on-surface-variant">
          We&apos;re having trouble reaching the horizon. Please check your signal and try again.
        </p>

        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-5 font-headline font-bold text-on-primary shadow-lg transition-all hover:bg-primary-container active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            Retry Connection
          </button>
          {onGoToSavedPlaces && (
            <button
              type="button"
              onClick={onGoToSavedPlaces}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-secondary-container px-6 py-4 font-headline font-semibold text-on-secondary-fixed transition-all hover:bg-surface-container-highest active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">bookmarks</span>
              Go to Saved Places
            </button>
          )}
        </div>

        <p className="mt-8 font-label text-xs font-medium uppercase tracking-widest text-on-surface-variant/60">
          Error Code: CONNECTION_FAILED
        </p>
      </div>
    </main>
  );
}
