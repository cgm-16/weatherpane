// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../frontend/shared/hooks/use-theme';

type ColorSchemeListener = (event: MediaQueryListEvent) => void;

function createColorSchemeMedia(prefersDark: boolean) {
  let matches = prefersDark;
  const listeners = new Set<ColorSchemeListener>();
  const addEventListener = vi.fn(
    (_type: 'change', listener: ColorSchemeListener) => listeners.add(listener)
  );
  const removeEventListener = vi.fn(
    (_type: 'change', listener: ColorSchemeListener) =>
      listeners.delete(listener)
  );

  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      addEventListener,
      matches: query === '(prefers-color-scheme: dark)' && matches,
      removeEventListener,
    })),
    writable: true,
  });

  return {
    addEventListener,
    removeEventListener,
    setDark(next: boolean) {
      matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

function renderTheme() {
  return renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    ),
  });
}

describe('useTheme — 시스템 테마 동작', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  test('저장된 system은 어두운 시스템 설정을 따른다', () => {
    const media = createColorSchemeMedia(true);
    const stored = JSON.stringify({ version: 1, data: 'system' });
    localStorage.setItem('weatherpane.theme.v1', stored);
    sessionStorage.setItem('weatherpane.theme.v1', stored);

    const { result } = renderTheme();

    expect(media.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    expect(result.current).toMatchObject({
      preference: 'system',
      theme: 'dark',
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('system 선택은 실행 중인 시스템 색상 변경을 반영한다', () => {
    const media = createColorSchemeMedia(false);
    const { result } = renderTheme();

    act(() => media.setDark(true));

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test.each([
    ['light', false, true, false],
    ['dark', true, false, true],
  ] as const)(
    '명시적 %s 테마는 이후 시스템 색상 변경을 무시한다',
    (preference, initialSystemDark, systemDark, expectedDark) => {
      const media = createColorSchemeMedia(initialSystemDark);
      const { result } = renderTheme();

      act(() => result.current.setPreference(preference));
      act(() => media.setDark(systemDark));

      expect(result.current).toMatchObject({
        preference,
        theme: expectedDark ? 'dark' : 'light',
      });
      expect(document.documentElement.classList.contains('dark')).toBe(
        expectedDark
      );
    }
  );

  test('명시적 선택은 두 테마 저장소에 같은 버전 payload로 저장한다', () => {
    createColorSchemeMedia(false);
    const { result } = renderTheme();

    act(() => result.current.setPreference('dark'));

    const expected = JSON.stringify({ data: 'dark', version: 1 });
    expect(localStorage.getItem('weatherpane.theme.v1')).toBe(expected);
    expect(sessionStorage.getItem('weatherpane.theme.v1')).toBe(expected);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('system 리스너는 Provider가 해제될 때 정리된다', () => {
    const media = createColorSchemeMedia(false);
    const { unmount } = renderTheme();

    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });
});
