// 연결 오류 화면입니다. 스냅샷 없이 fetch 실패 시 표시됩니다.
import { GlassContainer } from '~/shared/ui/glass-container';

interface HomeConnectionErrorProps {
  onRetry: () => void;
  // WP-017 즐겨찾기 구현 전까지는 전달하지 않으면 버튼을 숨깁니다.
  onGoToSavedPlaces?: () => void;
}

export function HomeConnectionError({
  onRetry,
  onGoToSavedPlaces,
}: HomeConnectionErrorProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="main"
    >
      <GlassContainer className="flex w-full max-w-md flex-col items-center rounded-lg p-8 text-center">
        {/* 오프라인 표시 */}
        <div className="mb-10 flex items-center gap-2 rounded-full bg-surface-container-high/40 px-4 py-2 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-outline-variant" />
          <span className="font-headline text-[11px] font-bold tracking-widest text-on-surface-variant uppercase">
            오프라인 상태
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
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg">
            <span
              className="material-symbols-outlined text-xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>
        </div>

        <h2 className="font-headline mb-4 text-3xl leading-tight font-extrabold text-on-surface">
          연결이 끊겼습니다
        </h2>
        <p className="mb-10 px-2 font-body text-base leading-relaxed text-on-surface-variant">
          날씨 정보를 불러오지 못했습니다. 신호 상태를 확인한 후 다시 시도해
          주세요.
        </p>

        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={onRetry}
            className="font-headline flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-5 font-bold text-on-primary shadow-lg transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            다시 시도
          </button>
          {onGoToSavedPlaces && (
            <button
              type="button"
              onClick={onGoToSavedPlaces}
              className="font-headline flex w-full items-center justify-center gap-2 rounded-sm bg-secondary-container px-6 py-4 font-semibold text-on-secondary-fixed transition-all hover:bg-surface-container-highest active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">
                bookmarks
              </span>
              Go to Saved Places
            </button>
          )}
        </div>

        <p className="font-label mt-8 text-xs font-medium tracking-widest text-on-surface-variant uppercase">
          오류 코드: CONNECTION_FAILED
        </p>
      </GlassContainer>
    </main>
  );
}
