import { createContext, use, useEffect, useState } from 'react';
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

function resolveInitialTheme(): ThemeMode {
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
    createThemeRepository().set(next);
  }

  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  return use(ThemeContext);
}
