import { test, expect } from './fixtures';

// routeDiscovery: 'initial'이면 RR7이 마운트 시 /__manifest를 요청하지 않는다.
test('초기 로드에서 /__manifest를 요청하지 않는다', async ({ page }) => {
  const manifestRequests: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/__manifest') {
      manifestRequests.push(req.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(manifestRequests).toEqual([]);
});
