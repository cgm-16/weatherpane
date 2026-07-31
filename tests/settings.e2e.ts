import { expect, test } from './fixtures';
import { storageKeys } from '../frontend/shared/lib/storage/storage-keys';

const activeLocation = JSON.stringify({
  version: 1,
  data: {
    kind: 'resolved',
    source: 'search',
    changedAt: '2026-07-31T00:00:00.000Z',
    location: {
      kind: 'resolved',
      locationId: 'loc_KR-Seoul',
      catalogLocationId: 'KR-Seoul',
      name: '서울',
      admin1: '서울특별시',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
    },
  },
});

const favorite = {
  favoriteId: 'fav-temperature-unit',
  location: {
    kind: 'resolved',
    locationId: 'loc_KR-Seoul',
    catalogLocationId: 'KR-Seoul',
    name: '서울',
    admin1: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  },
  nickname: null,
  order: 0,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
};

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

// #93: 활성 위치를 저장한 홈 대시보드는 기존 SSR/클라이언트 로딩 상태 불일치를 재현한다.
// pattern은 해당 기존 문제에만 있는 로딩 문구다.
test.describe('온도 단위 — 홈과 상세', () => {
  test.use({
    knownHydrationBug: { issue: '#93', pattern: '날씨 정보를 불러오는 중' },
  });

  test('화씨 선택은 새로고침 뒤 홈과 상세에 유지되고 섭씨로 되돌릴 수 있다', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: '화씨' }).check();
    await page.reload();
    await expect(page.getByRole('radio', { name: '화씨' })).toBeChecked();

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKeys.activeLocation,
      value: activeLocation,
    });
    await page.goto('/');
    await expect(page.getByText('63°').first()).toBeVisible();
    await page.getByRole('link', { name: /상세 보기/ }).click();
    await expect(page).toHaveURL(/\/location\/loc_KR-Seoul/);
    await expect(page.getByText('63°').first()).toBeVisible();
    await page.screenshot({
      path: 'test-results/temperature-units-home-detail-fahrenheit.png',
      fullPage: true,
    });

    await page.goto('/settings');
    await page.getByRole('radio', { name: '섭씨' }).check();
    await page.reload();
    await expect(page.getByRole('radio', { name: '섭씨' })).toBeChecked();
    await page.goto('/');
    await expect(page.getByText('17°').first()).toBeVisible();
  });
});

// #92: 저장된 즐겨찾기는 기존에 서버/클라이언트 초기 트리가 달라지는 경로다.
test.describe('온도 단위 — 즐겨찾기', () => {
  test.use({ knownHydrationBug: { issue: '#92', pattern: 'handleEnterEdit' } });

  test('화씨 선택은 새로고침 뒤 즐겨찾기 카드에 적용된다', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: '화씨' }).check();
    await page.reload();

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKeys.favorites,
      value: JSON.stringify({ version: 1, data: [favorite] }),
    });
    await page.goto('/favorites');
    await expect(page.getByText('63°')).toBeVisible();
    await page.screenshot({
      path: 'test-results/temperature-units-favorites-fahrenheit.png',
      fullPage: true,
    });
  });
});
