import { expect, test } from './fixtures';

test.describe('테마 시스템 — 스모크', () => {
  test.describe('dark 모드 진입/유지', () => {
    // #91: 테마 초기값을 클라이언트에서만 읽어 SSR과 어긋나는 기존 하이드레이션 버그.
    // 이 하위 describe의 테스트만 dark 모드 진입을 검증하며 해당 버그를 재현한다.
    // pattern: 테마 토글 버튼의 data-theme-toggle/aria-label과 아이콘의 dark_mode/
    // light_mode가 서버·클라이언트 간 diff에 남는 #91 고유 서명이다.
    test.use({
      knownHydrationBug: {
        issue: '#91',
        pattern: 'data-theme-toggle|dark_mode',
      },
    });

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
