/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { AppProviders } from '../../frontend/app/providers/app-providers';
import {
  BASELINE_MANIFEST,
  useSketchManifest,
} from '../../frontend/entities/asset';

// 매니페스트 컨텍스트에서 키 집합을 읽어 DOM으로 노출하는 테스트 프로브.
function Probe() {
  const manifest = useSketchManifest();
  return (
    <>
      <span data-testid="probe-count">{Object.keys(manifest).length}</span>
      <span data-testid="probe-keys">
        {JSON.stringify(Object.keys(manifest).sort())}
      </span>
    </>
  );
}

describe('AppProviders — SketchManifestProvider 연결', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // ThemeProvider가 시스템 테마를 조회할 때 사용하는 matchMedia 모의.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }))
    );
    // jsdom 환경에서 loadSessionManifest가 호출하는 원격 fetch를 차단해 콘솔 노이즈를 없앤다.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('test')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  test('AppProviders 내부에서 useSketchManifest가 베이스라인을 읽는다', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>
    );

    const expectedCount = Object.keys(BASELINE_MANIFEST).length;
    expect(screen.getByTestId('probe-count').textContent).toBe(
      String(expectedCount)
    );
  });

  test('localStorage 오버라이드가 없을 때 매니페스트 키 집합은 BASELINE_MANIFEST와 정확히 일치한다', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>
    );

    const expectedKeys = JSON.stringify(Object.keys(BASELINE_MANIFEST).sort());
    expect(screen.getByTestId('probe-keys').textContent).toBe(expectedKeys);
  });
});
