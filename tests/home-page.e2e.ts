import { expect, test } from '@playwright/test';

// 목 프로바이더는 어떤 위치에서도 17.2°C를 반환합니다.
// 앱 로드 전에 localStorage에 활성 위치를 미리 심어 두어야 합니다.
const ACTIVE_LOCATION_KEY = 'weatherpane.active-location.v1';

const seoulActiveLocation = JSON.stringify({
  version: 1,
  data: {
    kind: 'resolved',
    source: 'search',
    changedAt: new Date().toISOString(),
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

test('위치가 설정된 홈에서 날씨 대시보드가 표시된다', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ACTIVE_LOCATION_KEY, value: seoulActiveLocation }
  );

  await page.goto('/');

  // 대시보드 메인 컨텐츠 확인 (mock provider → 17.2°C → 17°로 표시)
  // 시간별 예보에도 17°가 나타나므로 first()로 메인 온도 텍스트만 선택합니다.
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText(/17°/).first()).toBeVisible();
  // 서울 위치명
  await expect(page.getByText('서울')).toBeVisible();
  // 상세 보기 링크
  await expect(page.getByRole('link', { name: /상세 보기/ })).toBeVisible();
  // 새로고침 버튼
  await expect(page.getByRole('button', { name: /새로고침/ })).toBeVisible();
});

test('홈 대시보드에서 상세 보기 클릭 시 상세 페이지로 이동한다', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ACTIVE_LOCATION_KEY, value: seoulActiveLocation }
  );

  await page.goto('/');
  await page.waitForSelector('[role="main"]');

  // 날씨 데이터가 로드될 때까지 대기 (시간별 예보에도 17°가 나타나므로 first() 사용)
  await expect(page.getByText(/17°/).first()).toBeVisible();
  await page.getByRole('link', { name: /상세 보기/ }).click();
  await expect(page).toHaveURL(/\/location\/KR-Seoul/);
});
