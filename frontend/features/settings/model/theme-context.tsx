import { createContext, use, useLayoutEffect, useState } from 'react';
import { getSessionStorage } from '~/shared/lib/storage/browser-storage';
import {
  createThemeRepository,
  type ThemePreference,
} from '~/shared/lib/storage/repositories/theme-repository';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  theme: 'light',
  setPreference: () => {},
  toggle: () => {},
});

function applyThemeToDom(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function createSessionThemeRepository() {
  return createThemeRepository({ storage: getSessionStorage() ?? undefined });
}

function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean
): ThemeMode {
  return preference === 'dark' || (preference === 'system' && prefersDark)
    ? 'dark'
    : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  // 첫 클라이언트 렌더는 서버와 같은 기본값을 사용하고, hydration 뒤에 저장값을 반영한다.
  useLayoutEffect(() => {
    const sessionPreference = createSessionThemeRepository().get();
    const storedPreference = sessionPreference ?? createThemeRepository().get();
    const nextPreference = storedPreference ?? 'system';
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    // eslint-disable-next-line @eslint-react/set-state-in-effect -- hydration 뒤에만 저장된 선택을 반영한다.
    setThemePreference(nextPreference);
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- hydration 뒤에만 유효 테마를 반영한다.
    setTheme(resolveTheme(nextPreference, prefersDark));
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- 첫 클라이언트 렌더의 기본값을 유지한 뒤 완료 상태를 반영한다.
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    if (!hydrated) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyResolvedTheme = (prefersDark: boolean) => {
      const nextTheme = resolveTheme(themePreference, prefersDark);
      applyThemeToDom(nextTheme);
      // eslint-disable-next-line @eslint-react/set-state-in-effect -- 미디어 쿼리의 유효 테마를 DOM 적용과 함께 동기화한다.
      setTheme(nextTheme);
    };

    applyResolvedTheme(mediaQuery.matches);

    if (themePreference !== 'system') return;

    const handleChange = (event: MediaQueryListEvent) => {
      applyResolvedTheme(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [hydrated, themePreference]);

  function setPreference(nextPreference: ThemePreference) {
    const nextTheme = resolveTheme(
      nextPreference,
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    applyThemeToDom(nextTheme);
    setThemePreference(nextPreference);
    setTheme(nextTheme);
    createThemeRepository().set(nextPreference);
    createSessionThemeRepository().set(nextPreference);
  }

  function toggle() {
    setPreference(theme === 'light' ? 'dark' : 'light');
  }

  return (
    <ThemeContext
      value={{ preference: themePreference, theme, setPreference, toggle }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  return use(ThemeContext);
}
