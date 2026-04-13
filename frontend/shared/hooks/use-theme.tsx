import { createContext, use, useEffect, useState } from 'react';
import { getSessionStorage } from '~/shared/lib/storage/browser-storage';
import { createThemeRepository } from '~/shared/lib/storage/repositories/theme-repository';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
});

function applyThemeToDom(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// sessionStorage 기반 저장소: localStorage가 지워져도 같은 탭 세션 내에서 테마를 유지한다.
function createSessionThemeRepository() {
  return createThemeRepository({ storage: getSessionStorage() ?? undefined });
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  // 탭 세션 내 값을 우선 확인하고, 없으면 localStorage 장기 저장값으로 폴백한다.
  const sessionStored = createSessionThemeRepository().get();
  if (sessionStored === 'light' || sessionStored === 'dark')
    return sessionStored;
  const stored = createThemeRepository().get();
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  function toggle() {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    applyThemeToDom(next);
    setTheme(next);
    // localStorage에 장기 저장하고, sessionStorage에도 동기화해 같은 탭 세션 내 내비게이션에서도 유지한다.
    createThemeRepository().set(next);
    createSessionThemeRepository().set(next);
  }

  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  return use(ThemeContext);
}
