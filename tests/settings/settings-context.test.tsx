// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  SettingsProvider,
  useSettings,
} from '../../frontend/features/settings';

type MotionListener = (event: MediaQueryListEvent) => void;

function createMotionMedia(prefersReduced: boolean) {
  let matches = prefersReduced;
  const listeners = new Set<MotionListener>();
  const addEventListener = vi.fn((_type: 'change', listener: MotionListener) =>
    listeners.add(listener)
  );
  const removeEventListener = vi.fn(
    (_type: 'change', listener: MotionListener) => listeners.delete(listener)
  );

  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      addEventListener,
      matches: query === '(prefers-reduced-motion: reduce)' && matches,
      removeEventListener,
    })),
    writable: true,
  });

  return {
    addEventListener,
    removeEventListener,
    setReduced(next: boolean) {
      matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
  };
}

function renderSettings() {
  return renderHook(() => useSettings(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <SettingsProvider>{children}</SettingsProvider>
    ),
  });
}

describe('useSettings — 저장 및 모션 환경설정', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-motion');
  });

  test('저장값이 없으면 C와 system을 사용한다', () => {
    createMotionMedia(false);
    const { result } = renderSettings();

    expect(result.current).toMatchObject({
      motionPreference: 'system',
      reduceMotion: false,
      temperatureUnit: 'C',
    });
    expect(document.documentElement).toHaveAttribute('data-motion', 'full');
  });

  test('저장된 F/reduced 선택을 hydration 뒤에 복원한다', () => {
    createMotionMedia(false);
    localStorage.setItem(
      'weatherpane.settings.v1',
      JSON.stringify({
        data: { motionPreference: 'reduced', temperatureUnit: 'F' },
        version: 1,
      })
    );

    const { result } = renderSettings();

    expect(result.current).toMatchObject({
      motionPreference: 'reduced',
      reduceMotion: true,
      temperatureUnit: 'F',
    });
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  });

  test.each([
    ['system', true, true],
    ['system', false, false],
    ['reduced', false, true],
    ['full', true, false],
  ] as const)(
    '%s 모션 선택은 시스템 reduced=%s에서 reduceMotion=%s이다',
    (motionPreference, prefersReduced, expected) => {
      createMotionMedia(prefersReduced);
      const { result } = renderSettings();

      act(() => result.current.setMotionPreference(motionPreference));

      expect(result.current.reduceMotion).toBe(expected);
      expect(document.documentElement).toHaveAttribute(
        'data-motion',
        expected ? 'reduced' : 'full'
      );
    }
  );

  test('system 모션 선택만 실행 중인 시스템 변경을 반영한다', () => {
    const media = createMotionMedia(false);
    const { result } = renderSettings();

    act(() => media.setReduced(true));
    expect(result.current.reduceMotion).toBe(true);

    act(() => result.current.setMotionPreference('full'));
    act(() => media.setReduced(false));
    expect(result.current.reduceMotion).toBe(false);
  });

  test('단위와 모션 선택을 하나의 버전 설정 payload로 저장한다', () => {
    createMotionMedia(false);
    const { result } = renderSettings();

    act(() => result.current.setTemperatureUnit('F'));
    act(() => result.current.setMotionPreference('reduced'));

    expect(localStorage.getItem('weatherpane.settings.v1')).toBe(
      JSON.stringify({
        data: { motionPreference: 'reduced', temperatureUnit: 'F' },
        version: 1,
      })
    );
  });

  test('system 모션 리스너는 Provider가 해제될 때 정리된다', () => {
    const media = createMotionMedia(false);
    const { unmount } = renderSettings();

    unmount();

    expect(media.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });
});
