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
    // /__manifest 경합 가드 — 근거는 tests/fixtures.ts의 manifestIssues 주석 참고
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByRole('radio', { name: '화씨' })).toBeChecked();

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKeys.activeLocation,
      value: activeLocation,
    });
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await expect(page.getByText('63°').first()).toBeVisible();
    await page.getByRole('link', { name: /상세 보기/ }).click();
    await expect(page).toHaveURL(/\/location\/loc_KR-Seoul/);
    await expect(page.getByText('63°').first()).toBeVisible();
    await page.screenshot({
      path: 'test-results/temperature-units-home-detail-fahrenheit.png',
      fullPage: true,
    });

    // 위 상세 보기 링크 클릭도 RR 라우트 전환이라 동일한 /__manifest 경쟁이 발생할 수
    // 있다 — 아래 goto 전에 networkidle을 기다려 경쟁을 없앤다.
    await page.waitForLoadState('networkidle');
    await page.goto('/settings');
    await page.getByRole('radio', { name: '섭씨' }).check();
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page.getByRole('radio', { name: '섭씨' })).toBeChecked();
    await page.waitForLoadState('networkidle');
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
    await page.waitForLoadState('networkidle');
    await page.reload();

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKeys.favorites,
      value: JSON.stringify({ version: 1, data: [favorite] }),
    });
    await page.waitForLoadState('networkidle');
    await page.goto('/favorites');
    await expect(page.getByText('63°')).toBeVisible();
    await page.screenshot({
      path: 'test-results/temperature-units-favorites-fahrenheit.png',
      fullPage: true,
    });
  });
});

test('확인된 로컬 데이터 초기화는 Weatherpane 값만 삭제하고 기본값으로 다시 시작한다', async ({
  page,
}) => {
  const localTargets = {
    [storageKeys.activeLocation]: activeLocation,
    [storageKeys.aqiSnapshots]: 'saved-aqi-snapshots',
    [storageKeys.favorites]: JSON.stringify({ version: 1, data: [favorite] }),
    [storageKeys.recents]: 'saved-recents',
    [storageKeys.settings]: JSON.stringify({
      data: { motionPreference: 'reduced', temperatureUnit: 'F' },
      version: 1,
    }),
    [storageKeys.theme]: JSON.stringify({ data: 'dark', version: 1 }),
    [storageKeys.weatherSnapshots]: 'saved-weather-snapshots',
  };
  const sessionTargets = {
    [storageKeys.theme]: JSON.stringify({ data: 'dark', version: 1 }),
    [storageKeys.unsupportedRouteContext]: 'saved-unsupported-context',
  };

  await page.addInitScript(
    ({ localTargets, sessionTargets }) => {
      if (sessionStorage.getItem('task5.reset-seed')) {
        return;
      }

      for (const [key, value] of Object.entries(localTargets)) {
        localStorage.setItem(key, value);
      }
      for (const [key, value] of Object.entries(sessionTargets)) {
        sessionStorage.setItem(key, value);
      }
      localStorage.setItem('other.local.key', 'keep-local');
      sessionStorage.setItem('other.session.key', 'keep-session');
      sessionStorage.setItem('task5.reset-seed', 'seeded');
    },
    { localTargets, sessionTargets }
  );
  await page.goto('/settings');
  const readStorage = () =>
    page.evaluate(
      ({ localKeys, sessionKeys }) => ({
        local: Object.fromEntries(
          localKeys.map((key) => [key, localStorage.getItem(key)])
        ),
        localUnrelated: localStorage.getItem('other.local.key'),
        session: Object.fromEntries(
          sessionKeys.map((key) => [key, sessionStorage.getItem(key)])
        ),
        sessionUnrelated: sessionStorage.getItem('other.session.key'),
      }),
      {
        localKeys: Object.keys(localTargets),
        sessionKeys: Object.keys(sessionTargets),
      }
    );
  const beforeCancel = await readStorage();

  await page.getByRole('button', { name: '로컬 데이터 초기화' }).click();
  await expect(
    page.getByRole('alertdialog', { name: '로컬 데이터 초기화' })
  ).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();

  expect(await readStorage()).toEqual(beforeCancel);

  await page.getByRole('button', { name: '로컬 데이터 초기화' }).click();
  await page.screenshot({
    path: 'test-results/settings-local-data-reset-confirmation.png',
    fullPage: true,
  });
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: '초기화', exact: true }).click(),
  ]);

  const afterReset = await readStorage();
  expect(Object.values(afterReset.local)).toEqual(
    Object.values(localTargets).map(() => null)
  );
  expect(Object.values(afterReset.session)).toEqual(
    Object.values(sessionTargets).map(() => null)
  );
  expect(afterReset.localUnrelated).toBe('keep-local');
  expect(afterReset.sessionUnrelated).toBe('keep-session');
  await expect(
    page.getByRole('radio', { name: '시스템', exact: true })
  ).toBeChecked();
  await expect(page.getByRole('radio', { name: '섭씨' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '시스템 설정' })).toBeChecked();
  await page.screenshot({
    path: 'test-results/settings-local-data-reset.png',
    fullPage: true,
  });
});
