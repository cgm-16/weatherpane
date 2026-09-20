import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRemoteManifest } from '~/entities/asset/api/fetch-remote-manifest';

describe('fetchRemoteManifest', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('헤더 수신 후 본문이 멈춰도 요청 시작 5초 후 타임아웃으로 종료한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      const response = new Response();
      vi.spyOn(response, 'json').mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      );
      return response;
    });

    let failure: unknown;
    void fetchRemoteManifest().catch((error: unknown) => {
      failure = error;
    });
    await vi.advanceTimersByTimeAsync(4_999);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toMatchObject({
      message: 'remote manifest fetch timed out after 5000ms',
      cause: expect.objectContaining({ name: 'AbortError' }),
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('정상 본문을 반환하고 타이머를 정리한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ 'hub/seoul/clear-day': '/next.webp' })
    );
    await expect(fetchRemoteManifest()).resolves.toEqual({
      'hub/seoul/clear-day': '/next.webp',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [new Response(null, { status: 503 }), 'remote manifest fetch failed: 503'],
    [Response.json([]), 'remote manifest fetch failed: invalid shape'],
    [new Response('{'), 'JSON'],
  ])(
    '응답 오류를 유지하고 타이머를 정리한다 (%#)',
    async (response, message) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response);
      await expect(fetchRemoteManifest()).rejects.toThrow(message);
      expect(vi.getTimerCount()).toBe(0);
    }
  );
});
