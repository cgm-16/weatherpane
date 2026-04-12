import { expect, test } from '@playwright/test';

test('위치 없이 홈 진입 시 검색 안내 화면을 표시한다', async ({ page }) => {
  // 앱 부트스트랩 전에 localStorage를 비워 위치 없는 상태를 보장합니다.
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: '위치를 선택하세요' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '지역 검색' })).toBeVisible();
  await expect(page.getByRole('link', { name: '지역 검색' })).toHaveAttribute('href', '/search');
});
