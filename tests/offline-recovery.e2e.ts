import { test, expect } from '@playwright/test';

// 오프라인 배너 표시 및 온라인 복구 시나리오 스모크 테스트.
// mock 모드에서 실행되므로 실제 네트워크 없이도 날씨 데이터가 표시됩니다.
test.describe('오프라인 배너 및 복구', () => {
  test('오프라인 전환 시 배너가 표시되고, 온라인 복구 시 배너가 사라진다', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    // 온라인 상태에서 배너가 없음을 확인합니다
    await expect(page.getByRole('alert')).not.toBeVisible();

    // 오프라인으로 전환합니다
    await context.setOffline(true);

    // 배너가 표시됩니다
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('오프라인 상태');

    // 온라인으로 복구합니다
    await context.setOffline(false);

    // 배너가 사라집니다
    await expect(page.getByRole('alert')).not.toBeVisible();
  });
});
