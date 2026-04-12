import { expect, test } from '@playwright/test';

test('검색 결과 선택 시 Detail로 이동하고 날씨가 표시된다', async ({
  page,
}) => {
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

test('최근 방문 지역은 재로드 후에도 유지되며 인기 지역 위에 표시된다', async ({
  page,
}) => {
  // 청운동을 검색하고 선택하여 최근 지역에 추가
  await page.goto('/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99');
  await page.getByRole('searchbox', { name: '지역 검색' }).press('Enter');
  await page.waitForURL(/\/location\//);

  // 검색 기본 상태로 돌아감
  await page.goto('/search');

  // 최근 지역 섹션이 표시됨
  await expect(page.getByRole('heading', { name: '최근 지역' })).toBeVisible();

  // 방문한 위치가 최근 지역에 표시됨
  const recentsRegion = page.getByRole('region', { name: '최근 지역' });
  await expect(recentsRegion.getByText('청운동')).toBeVisible();

  // 인기 지역 섹션도 여전히 표시됨
  await expect(page.getByRole('heading', { name: '인기 지역' })).toBeVisible();

  // 최근 지역이 인기 지역보다 위에 위치함
  const recentsHeading = page.getByRole('heading', { name: '최근 지역' });
  const popularHeading = page.getByRole('heading', { name: '인기 지역' });
  const recentsY = (await recentsHeading.boundingBox())?.y ?? 0;
  const popularY = (await popularHeading.boundingBox())?.y ?? 0;
  expect(recentsY).toBeLessThan(popularY);

  // 재로드 후에도 최근 지역이 유지됨
  await page.reload();
  await expect(page.getByRole('heading', { name: '최근 지역' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: '최근 지역' }).getByText('청운동')
  ).toBeVisible();
});
