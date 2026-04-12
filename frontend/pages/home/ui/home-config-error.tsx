// 설정 오류 화면입니다. API 키 또는 제공자 모드가 잘못 설정된 경우 표시됩니다.
import type { ConfigError } from '~/shared/lib/env-config';

interface HomeConfigErrorProps {
  error: ConfigError;
  onOpenSettings?: () => void;
  onRetry?: () => void;
}

export function HomeConfigError({ error, onOpenSettings, onRetry }: HomeConfigErrorProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-background" role="main">
      <div className="w-full max-w-md rounded-xl bg-white/50 p-8 backdrop-blur-[20px] shadow-2xl flex flex-col items-center text-center">
        {/* 아이콘 */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-4xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
        </div>

        <h2 className="font-headline mb-3 text-3xl font-extrabold tracking-tight text-on-surface">
          Settings Update Needed
        </h2>
        <p className="font-body mb-8 px-4 leading-relaxed text-on-surface-variant">
          Your travel concierge needs a quick adjustment. It looks like an API key or location
          setting is missing.
        </p>

        {/* 오류 상세 */}
        <div className="mb-8 w-full space-y-3">
          <div className="flex items-center gap-4 rounded-lg bg-surface-container-highest/50 p-4 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest">
              <span className="material-symbols-outlined text-on-surface-variant">key</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-headline text-sm font-bold text-on-surface">{error.field}</p>
              <p className="font-body text-xs text-on-surface-variant">{error.message}</p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-14 w-full rounded-sm bg-primary font-headline font-bold text-on-primary shadow-lg transition-all hover:bg-primary-container active:scale-95"
            >
              Open Settings
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-14 w-full rounded-sm bg-secondary-container font-headline font-bold text-on-secondary-fixed transition-all hover:bg-surface-container-highest active:scale-95"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
