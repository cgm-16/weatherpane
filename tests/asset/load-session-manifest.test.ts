/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BASELINE_MANIFEST } from '~/entities/asset/model/manifest';
import {
  PENDING_MANIFEST_STORAGE_KEY,
  loadSessionManifest,
} from '~/entities/asset/api/load-session-manifest';

describe('loadSessionManifest', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pending override가 없으면 baseline을 반환한다', () => {
    const manifest = loadSessionManifest({ remoteFetcher: vi.fn() });
    expect(manifest).toEqual(BASELINE_MANIFEST);
  });

  it('pending override를 baseline에 병합한다', () => {
    window.localStorage.setItem(
      PENDING_MANIFEST_STORAGE_KEY,
      JSON.stringify({
        'hub/seoul/clear-day': 'https://cdn.example.com/seoul-clear.webp',
      })
    );
    const manifest = loadSessionManifest({ remoteFetcher: vi.fn() });
    expect(manifest['hub/seoul/clear-day']).toBe(
      'https://cdn.example.com/seoul-clear.webp'
    );
    expect(manifest['hub/busan/clear-day']).toBe(
      BASELINE_MANIFEST['hub/busan/clear-day']
    );
  });

  it('pending JSON 파싱이 실패하면 baseline으로 폴백하고 pending을 정리한다', () => {
    window.localStorage.setItem(PENDING_MANIFEST_STORAGE_KEY, '{not valid');
    const manifest = loadSessionManifest({ remoteFetcher: vi.fn() });
    expect(manifest).toEqual(BASELINE_MANIFEST);
    expect(
      window.localStorage.getItem(PENDING_MANIFEST_STORAGE_KEY)
    ).toBeNull();
  });

  it('반환된 매니페스트는 frozen이다', () => {
    const manifest = loadSessionManifest({ remoteFetcher: vi.fn() });
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it('백그라운드 remoteFetcher를 호출하지만 세션 매니페스트는 변하지 않는다', async () => {
    const remoteFetcher = vi.fn().mockResolvedValue({
      'hub/seoul/clear-day': 'https://cdn.example.com/next-load.webp',
    });
    const manifest = loadSessionManifest({ remoteFetcher });
    expect(remoteFetcher).toHaveBeenCalledOnce();
    // 백그라운드 fetch가 끝나도 현재 세션 manifest는 baseline 그대로다.
    await vi.waitFor(() => {
      expect(
        window.localStorage.getItem(PENDING_MANIFEST_STORAGE_KEY)
      ).not.toBeNull();
    });
    expect(manifest['hub/seoul/clear-day']).toBe(
      BASELINE_MANIFEST['hub/seoul/clear-day']
    );
  });

  it('remoteFetcher 성공 시 다음 로드용으로 pending에 기록한다', async () => {
    const next = {
      'hub/seoul/clear-day': 'https://cdn.example.com/v2.webp',
    };
    const remoteFetcher = vi.fn().mockResolvedValue(next);
    loadSessionManifest({ remoteFetcher });
    await vi.waitFor(() => {
      const stored = window.localStorage.getItem(PENDING_MANIFEST_STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual(next);
    });
  });

  it('remoteFetcher 실패 시 기존 pending을 건드리지 않는다', async () => {
    const existing = JSON.stringify({
      'hub/seoul/clear-day': 'https://cdn.example.com/keep.webp',
    });
    window.localStorage.setItem(PENDING_MANIFEST_STORAGE_KEY, existing);
    const remoteFetcher = vi.fn().mockRejectedValue(new Error('network'));
    loadSessionManifest({ remoteFetcher });
    // 실패가 비동기적으로 처리될 시간을 준다.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(window.localStorage.getItem(PENDING_MANIFEST_STORAGE_KEY)).toBe(
      existing
    );
  });
});
