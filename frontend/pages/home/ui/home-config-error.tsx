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

        <h2 className="font-headline mb-3 text-3xl font-extrabold tracking-tight text-on-surface">
          설정 업데이트가 필요합니다
        </h2>
        <p className="mb-8 px-4 font-body leading-relaxed text-on-surface-variant">
          API 키 또는 위치 설정이 누락된 것 같습니다. 설정을 확인해 주세요.
        </p>

        {/* 오류 상세 */}
        <div className="mb-8 w-full space-y-3">
          <div className="flex items-center gap-4 rounded-lg bg-surface-container-highest/50 p-4 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest">
              <span className="material-symbols-outlined text-on-surface-variant">
                key
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-headline text-sm font-bold text-on-surface">
                {error.field}
              </p>
              <p className="font-body text-xs text-on-surface-variant">
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
              className="font-headline h-14 w-full rounded-sm bg-primary font-bold text-on-primary shadow-lg transition-all hover:bg-primary-container active:scale-95"
            >
              {/* eslint-disable-next-line weatherpane/korean-jsx-text -- #152에서 기존 영문 문구를 정리합니다. */}
              Open Settings
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="font-headline h-14 w-full rounded-sm bg-secondary-container font-bold text-on-secondary-fixed transition-all hover:bg-surface-container-highest active:scale-95"
            >
              {/* eslint-disable-next-line weatherpane/korean-jsx-text -- #152에서 기존 영문 문구를 정리합니다. */}
              Try Again
            </button>
          )}
        </div>
      </GlassContainer>
    </main>
  );
}
