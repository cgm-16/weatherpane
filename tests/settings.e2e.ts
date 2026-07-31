import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('설정 주소로 직접 진입하면 셸 안에 환경설정 화면을 표시한다', async ({
  page,
}) => {
  await page.goto('/settings');

  await expect(page).toHaveTitle('Weatherpane | 설정');
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await expect(
    page.getByText('화면 표시와 접근성 환경을 관리합니다.')
  ).toBeVisible();
  await expect(page.getByRole('group', { name: '테마' })).toBeVisible();
  await expect(page.getByRole('group', { name: '온도 단위' })).toBeVisible();
  await expect(page.getByRole('group', { name: '동작 줄이기' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '어두운 모드로 전환' })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '밝은 모드로 전환' })
  ).toHaveCount(0);
});

test('모바일 하단 내비게이션에서 설정으로 이동한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', {
    name: '기본 내비게이션',
  });
  const settingsLink = navigation.getByRole('link', { name: '설정' });

  await expect(settingsLink).toHaveAttribute('href', '/settings');
  await settingsLink.click();

  await expect(page).toHaveURL('/settings');
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await expect(settingsLink).toHaveAttribute('aria-current', 'page');
  await page.screenshot({
    path: 'test-results/settings-mobile.png',
    fullPage: true,
  });
});

test('데스크톱 사이드바에서 설정으로 이동한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const sidebar = page.getByRole('complementary', {
    name: '사이드바 내비게이션',
  });
  const settingsLink = sidebar.getByRole('link', { name: '설정' });

  await expect(settingsLink).toHaveAttribute('href', '/settings');
  await settingsLink.click();

  await expect(page).toHaveURL('/settings');
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await expect(settingsLink).toHaveAttribute('aria-current', 'page');
  await page.screenshot({
    path: 'test-results/settings-desktop.png',
    fullPage: true,
  });
});
