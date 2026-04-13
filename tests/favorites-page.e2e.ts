import { expect, test } from '@playwright/test';
import { storageKeys } from '../frontend/shared/lib/storage/storage-keys';

const FAVORITES_KEY = storageKeys.favorites;

const NOW = new Date().toISOString();

const seoulFav = {
  favoriteId: 'fav-e2e-seoul',
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
  createdAt: NOW,
  updatedAt: NOW,
};

const busanFav = {
  favoriteId: 'fav-e2e-busan',
  location: {
    kind: 'resolved',
    locationId: 'loc_KR-Busan',
    catalogLocationId: 'KR-Busan',
    name: '부산',
    admin1: '부산광역시',
    latitude: 35.1796,
    longitude: 129.0756,
    timezone: 'Asia/Seoul',
  },
  nickname: '해운대',
  order: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

function favoritesPayload(favs: object[]) {
  return JSON.stringify({ data: favs, version: 1 });
}

test.describe('Favorites page', () => {
  test('shows empty state when no favorites are saved', async ({ page }) => {
    await page.goto('/favorites');
    await expect(
      page.getByRole('link', { name: /장소 검색하기/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /현재 위치 보기/i })
    ).toBeVisible();
  });

  test('renders a saved location after seeding localStorage', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([seoulFav]) }
    );
    await page.goto('/favorites');
    await expect(page.getByText('서울')).toBeVisible();
  });

  test('renders nickname when favorite has one', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([busanFav]) }
    );
    await page.goto('/favorites');
    await expect(page.getByText('해운대')).toBeVisible();
  });

  test('favorites persist across page reload', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([seoulFav]) }
    );
    await page.goto('/favorites');
    await expect(page.getByText('서울')).toBeVisible();
    await page.reload();
    await expect(page.getByText('서울')).toBeVisible();
  });

  test('renders multiple favorites as a grid', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([seoulFav, busanFav]) }
    );
    await page.goto('/favorites');
    await expect(page.getByText('서울')).toBeVisible();
    await expect(page.getByText('해운대')).toBeVisible();
  });
});

test.describe('Favorites page — 편집/정렬 모드', () => {
  test('편집 button appears when favorites exist', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([seoulFav]) }
    );
    await page.goto('/favorites');
    await expect(page.getByRole('button', { name: /편집/i })).toBeVisible();
  });

  test('entering edit mode shows up/down buttons and nickname input', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: FAVORITES_KEY, value: favoritesPayload([seoulFav, busanFav]) }
    );
    await page.goto('/favorites');
    await page.getByRole('button', { name: /편집/i }).click();
    await expect(
      page.getByRole('button', { name: /즐겨찾기 해운대 위로 이동/i })
    ).toBeVisible();
    await expect(page.getByRole('textbox').first()).toBeVisible();
  });

  test('nickname persists after editing and reload', async ({ page }) => {
    // page.evaluate로 씨딩하면 재로드 시 재실행되지 않아 앱이 저장한 상태가 유지된다
    await page.goto('/favorites');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: FAVORITES_KEY,
      value: favoritesPayload([seoulFav]),
    });
    await page.reload();
    await page.getByRole('button', { name: /편집/i }).click();
    const input = page.getByRole('textbox').first();
    await input.fill('서울역');
    await page.getByRole('button', { name: /완료/i }).click();
    await page.reload();
    await expect(page.getByText('서울역')).toBeVisible();
  });

  test('reorder via 위로 button persists after reload', async ({ page }) => {
    // page.evaluate로 씨딩하면 재로드 시 재실행되지 않아 앱이 저장한 상태가 유지된다
    await page.goto('/favorites');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: FAVORITES_KEY,
      value: favoritesPayload([seoulFav, busanFav]),
    });
    await page.reload();
    await page.getByRole('button', { name: /편집/i }).click();
    await page
      .getByRole('button', { name: /즐겨찾기 해운대 위로 이동/i })
      .click();
    await page.getByRole('button', { name: /완료/i }).click();
    await page.reload();
    // 두 카드 제목이 모두 DOM에 나타날 때까지 대기
    const headings = page.locator('h3');
    await expect(headings).toHaveCount(2);
    const texts = await headings.allTextContents();
    // 해운대(부산)가 첫 번째로 나타나야 한다
    const busanIndex = texts.findIndex((t) => t.includes('해운대'));
    const seoulIndex = texts.findIndex((t) => t.includes('서울'));
    expect(busanIndex).toBeLessThan(seoulIndex);
  });
});
