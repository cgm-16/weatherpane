import { expect, test } from '@playwright/test';

test('direct-open search hydrates from q and Enter follows the highlighted result', async ({
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

  await searchbox.click();
  await searchbox.press('Enter');

  await expect(page).toHaveURL(/\/location\/5f5def784f91$/);
});
