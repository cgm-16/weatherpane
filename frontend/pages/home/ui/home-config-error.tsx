// 설정 오류 화면입니다. API 키 또는 제공자 모드가 잘못 설정된 경우 표시됩니다.
import type { ConfigError } from '~/shared/lib/env-config';
import { GlassContainer } from '~/shared/ui/glass-container';

interface HomeConfigErrorProps {
  error: ConfigError;
  onOpenSettings?: () => void;
  onRetry?: () => void;
}

export function HomeConfigError({
  error,
  onOpenSettings,
  onRetry,
}: HomeConfigErrorProps) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
      role="main"
    >
      <GlassContainer className="flex w-full max-w-md flex-col items-center rounded-xl p-8 text-center shadow-2xl">
        {/* 아이콘 */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span
            className="material-symbols-outlined text-4xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
        </div>

        <h2 className="font-headline text-on-surface mb-3 text-3xl font-extrabold tracking-tight">
          설정 업데이트가 필요합니다
        </h2>
        <p className="text-on-surface-variant mb-8 px-4 font-body leading-relaxed">
          API 키 또는 위치 설정이 누락된 것 같습니다. 설정을 확인해 주세요.
        </p>

        {/* 오류 상세 */}
        <div className="mb-8 w-full space-y-3">
          <div className="flex items-center gap-4 rounded-lg bg-surface-container-highest/50 p-4 backdrop-blur-md">
            <div className="bg-surface-container-lowest flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-on-surface-variant">
                key
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-headline text-on-surface text-sm font-bold">
                {error.field}
              </p>
              <p className="text-on-surface-variant font-body text-xs">
                {error.message}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="font-headline text-on-primary hover:bg-primary-container h-14 w-full rounded-sm bg-primary font-bold shadow-lg transition-all active:scale-95"
            >
              Open Settings
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="bg-secondary-container font-headline text-on-secondary-fixed h-14 w-full rounded-sm font-bold transition-all hover:bg-surface-container-highest active:scale-95"
            >
              Try Again
            </button>
          )}
        </div>
      </GlassContainer>
    </main>
  );
}
