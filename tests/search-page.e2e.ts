import { expect, test } from '@playwright/test';

test('검색 결과 선택 시 Detail로 이동하고 날씨가 표시된다', async ({ page }) => {
  await page.goto('/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99');

  const searchbox = page.getByRole('searchbox', { name: '지역 검색' });
  const highlightedResult = page.getByRole('option', {
    name: '서울특별시-종로구-청운동',
  });

  await expect(searchbox).toHaveValue('청운동');
  await expect(page.getByRole('listbox', { name: '검색 결과' })).toBeVisible();
  await expect(highlightedResult).toHaveAttribute('aria-selected', 'true');

  await searchbox.press('Enter');

  // URL이 catalogLocationId로 이동했는지 확인
  await expect(page).toHaveURL(/\/location\/[0-9a-f]{12}$/);

  // 목 프로바이더 → 날씨 대시보드가 표시됨
  await expect(page.getByText(/17°/).first()).toBeVisible();
});

test('비지원 위치 토큰으로 접근 시 미지원 페이지가 표시되고 검색으로 돌아갈 수 있다', async ({
  page,
}) => {
  // 비지원 URL로 직접 접근 — 검색 선택 후 비지원 경로의 최종 상태를 검증합니다.
  await page.goto('/location/unsupported::5f5def784f91');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /검색으로 돌아가기/ })
  ).toBeVisible();

  // 검색 링크를 클릭하면 검색 페이지로 돌아감
  await page.getByRole('link', { name: /검색으로 돌아가기/ }).click();
  await expect(page).toHaveURL('/search');
});
