import type { ProviderMode } from '~/shared/lib/env-config';

interface DevProviderToggleProps {
  currentMode: ProviderMode;
  isDev?: boolean;
}

// 개발 전용 프로바이더 모드 토글. 프로덕션에서는 렌더링되지 않는다.
export function DevProviderToggle({
  currentMode,
  isDev = import.meta.env.DEV,
}: DevProviderToggleProps) {
  if (!isDev) return null;

  function handleToggle() {
    const next: ProviderMode = currentMode === 'mock' ? 'real' : 'mock';
    localStorage.setItem('__wp_dev_provider_mode', next);
    window.location.reload();
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={`개발 모드: ${currentMode}. 클릭하면 전환 후 재로드합니다`}
      className="fixed right-4 bottom-4 z-50 rounded-full bg-foreground px-3 py-1 font-mono text-xs text-background opacity-70 transition-opacity select-none hover:opacity-100"
    >
      {currentMode === 'mock' ? '🔵 mock' : '🟠 real'}
    </button>
  );
}
