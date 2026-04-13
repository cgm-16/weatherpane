import { expect, test } from '@playwright/test';
import { storageKeys } from '../frontend/shared/lib/storage/storage-keys';

// 목 프로바이더는 어떤 위치에서도 17.2°C를 반환합니다.
// 앱 로드 전에 localStorage에 활성 위치를 미리 심어 두어야 합니다.
const ACTIVE_LOCATION_KEY = storageKeys.activeLocation;

const seoulActiveLocation = JSON.stringify({
  version: 1,
  data: {
    kind: 'resolved',
    source: 'search',
    changedAt: '2026-04-12T00:00:00.000Z',
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

test('유효한 상세 페이지에서 날씨 대시보드가 표시된다', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ACTIVE_LOCATION_KEY, value: seoulActiveLocation }
  );

  await page.goto('/location/KR-Seoul');

  // 메인 컨텐츠 영역 확인
  await expect(page.getByRole('main')).toBeVisible();
  // 목 프로바이더 → 17.2°C → 17°로 표시 (시간별 예보에도 나타나므로 first() 사용)
  await expect(page.getByText(/17°/).first()).toBeVisible();
  // 서울 위치명 확인
  await expect(page.getByText('서울')).toBeVisible();
  // 새로고침 버튼 확인
  await expect(page.getByRole('button', { name: /새로고침/ })).toBeVisible();
  // 홈으로 돌아가기 링크 확인
  await expect(
    page.getByRole('link', { name: /홈으로 돌아가기/ })
  ).toBeVisible();
  // 스케치 배경 이미지가 렌더링되고 /sketches/*.webp 경로를 가리키는지 확인
  const sketchImg = page.locator('img[data-sketch-key="hub/seoul/clear-day"]');
  await expect(sketchImg).toBeVisible();
  await expect(sketchImg).toHaveAttribute('src', /^\/sketches\/.+\.webp$/);
});

test('활성 위치 없이 접근하면 찾을 수 없음 페이지가 표시된다', async ({
  page,
}) => {
  // localStorage를 미리 심지 않아 활성 위치가 없는 상태
  await page.goto('/location/KR-Seoul');

  // 메인 컨텐츠 영역 확인
  await expect(page.getByRole('main')).toBeVisible();
  // 홈으로 돌아가기 링크 확인
  await expect(page.getByRole('link', { name: /홈으로/ })).toBeVisible();
});

test('지원하지 않는 토큰으로 접근하면 미지원 페이지가 표시된다', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: ACTIVE_LOCATION_KEY, value: seoulActiveLocation }
  );

  await page.goto('/location/unsupported::KR-Busan');

  // 메인 컨텐츠 영역 확인
  await expect(page.getByRole('main')).toBeVisible();
  // 검색으로 돌아가기 링크 확인
  await expect(
    page.getByRole('link', { name: /검색으로 돌아가기/ })
  ).toBeVisible();
});
