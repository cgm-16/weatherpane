import { expect, test } from '@playwright/test';

test.describe('테마 시스템 — 스모크', () => {
  test('첫 방문: 시스템 어두운 모드 설정 시 dark 테마로 진입', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('테마 토글 후 페이지 이동해도 dark 유지', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await page
      .getByRole('button', { name: '어두운 모드로 전환' })
      .first()
      .click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.goto('/favorites');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('테마 토글 후 새로고침해도 dark 유지', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await page
      .getByRole('button', { name: '어두운 모드로 전환' })
      .first()
      .click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('모바일 뷰포트: 하단 내비게이션이 렌더링된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: '기본 내비게이션' })
    ).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: '사이드바 내비게이션' })
    ).not.toBeVisible();
  });

  test('데스크톱 뷰포트: 사이드바 내비게이션이 렌더링된다', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(
      page.getByRole('complementary', { name: '사이드바 내비게이션' })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: '기본 내비게이션' })
    ).not.toBeVisible();
  });
});
