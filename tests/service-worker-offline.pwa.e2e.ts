import { test, expect } from './fixtures';

// 서비스 워커가 앱 셸/에셋을 캐시하면, 이전에 연 적 있는 페이지는 오프라인 새로고침에서도
// 부팅된다. SW는 "이미 제어 중인" 로드에서만 런타임 캐시를 채우므로(첫 방문에는 아직
// 제어권이 없다), 오프라인 전환 전에 온라인으로 한 번 더 새로고침해 캐시를 채운다 —
// 이는 표준 PWA 동작이며 실제 2회차 방문과 동일하다.
test.describe('서비스 워커 오프라인 앱 셸', () => {
  test('오프라인 새로고침에도 앱 셸이 부팅된다', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => !!navigator.serviceWorker?.controller,
      null,
      {
        timeout: 15_000,
      }
    );

    // SW가 제어하는 상태에서 한 번 더 로드해 셸/에셋 캐시를 채운다.
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 오프라인 전환 후 새로고침 — 전부 캐시에서 제공되어야 한다.
    await context.setOffline(true);
    await page.reload();

    // 앱이 하이드레이트되어 오프라인을 감지하면 배너(role="alert")가 뜬다. 브라우저
    // 오프라인 오류 페이지였다면 이 배너는 존재하지 않는다.
    await expect(page.getByRole('alert')).toContainText('오프라인 상태', {
      timeout: 15_000,
    });

    await context.setOffline(false);
  });

  test('고정 URL 스케치는 온라인 재검증 뒤 오프라인에 최신 캐시를 쓴다', async ({
    page,
    context,
  }) => {
    const sketchPath = '/sketches/hub/seoul/clear-day.webp';

    await page.goto('/');
    await page.waitForFunction(
      () => !!navigator.serviceWorker?.controller,
      null,
      {
        timeout: 15_000,
      }
    );

    await page.evaluate(async (path) => {
      const cache = await caches.open('weatherpane-assets-v1');
      await cache.put(
        path,
        new Response('오래된 스케치', {
          headers: { 'content-type': 'text/plain' },
        })
      );
    }, sketchPath);

    const onlineResponse = await page.evaluate(async (path) => {
      const response = await fetch(path);
      return {
        contentType: response.headers.get('content-type'),
        byteLength: (await response.arrayBuffer()).byteLength,
      };
    }, sketchPath);

    expect(onlineResponse.contentType).toContain('image/webp');
    expect(onlineResponse.byteLength).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(async (path) => {
          const cached = await (
            await caches.open('weatherpane-assets-v1')
          ).match(path);
          return cached
            ? {
                contentType: cached.headers.get('content-type'),
                byteLength: (await cached.arrayBuffer()).byteLength,
              }
            : null;
        }, sketchPath)
      )
      .toEqual(onlineResponse);

    await context.setOffline(true);
    try {
      const offlineResponse = await page.evaluate(async (path) => {
        const response = await fetch(path);
        return {
          contentType: response.headers.get('content-type'),
          byteLength: (await response.arrayBuffer()).byteLength,
        };
      }, sketchPath);

      expect(offlineResponse).toEqual(onlineResponse);
    } finally {
      await context.setOffline(false);
    }
  });
});
