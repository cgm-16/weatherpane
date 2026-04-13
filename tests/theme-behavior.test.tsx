// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// matchMedia 모의: 인수에 따라 matches 제어
function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    writable: true,
  });
}

describe('useTheme — 시스템 테마 기본 경로', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  test('저장값 없음 + 시스템 어두운 모드 → dark 테마 적용', async () => {
    mockMatchMedia(true);
    const { ThemeProvider, useTheme } =
      await import('../frontend/shared/hooks/use-theme');
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.theme).toBe('dark');
  });

  test('저장값 없음 + 시스템 밝은 모드 → light 테마 적용', async () => {
    mockMatchMedia(false);
    const { ThemeProvider, useTheme } =
      await import('../frontend/shared/hooks/use-theme');
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.theme).toBe('light');
  });
});

describe('useTheme — 저장된 테마 복원', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false); // 시스템은 밝은 모드
  });

  test('저장값 dark → 시스템 무관하게 dark 테마 적용', async () => {
    localStorage.setItem(
      'weatherpane.theme.v1',
      JSON.stringify({ version: 1, data: 'dark' })
    );
    const { ThemeProvider, useTheme } =
      await import('../frontend/shared/hooks/use-theme');
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.theme).toBe('dark');
  });

  test('toggle() 호출 후 선택이 localStorage에 유지된다', async () => {
    const { ThemeProvider, useTheme } =
      await import('../frontend/shared/hooks/use-theme');
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    const stored = JSON.parse(localStorage.getItem('weatherpane.theme.v1')!);
    expect(stored.data).toBe('dark');
  });

  test('toggle() 두 번 호출 → 원래 테마로 복귀', async () => {
    const { ThemeProvider, useTheme } =
      await import('../frontend/shared/hooks/use-theme');
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
