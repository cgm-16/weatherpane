import { expect, test } from '@playwright/test';

test('boots the home placeholder shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Weatherpane' })
  ).toBeVisible();
  await expect(page.getByText('Home placeholder')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Search' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Favorites' })).toBeVisible();
});
