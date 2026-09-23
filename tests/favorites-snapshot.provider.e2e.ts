import { expect, test } from './fixtures';
import { mockOpenWeatherCoreWeatherFixture } from '../frontend/entities/weather/api/openweather';
import { storageKeys } from '../frontend/shared/lib/storage/storage-keys';

const locationId = 'loc_KR-Seoul';
const now = new Date('2026-09-21T03:00:00Z');
const favorite = {
  favoriteId: 'fav-snapshot-seoul',
  location: {
    kind: 'resolved',
    locationId,
    catalogLocationId: 'KR-Seoul',
    name: '서울',
    admin1: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  },
  nickname: null,
  order: 0,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

for (const { ageMinutes, expired } of [
  { ageMinutes: 24 * 60 - 1, expired: false },
  { ageMinutes: 24 * 60 + 1, expired: true },
]) {
  test(`${ageMinutes}분 된 영속 스냅샷은 조회 실패와 오프라인에서 ${expired ? '인라인 오류를 표시한다' : '탐색 가능한 stale 카드를 유지한다'}`, async ({
    page,
    context,
  }, testInfo) => {
    let failWeather = false;
    let failedRequests = 0;
    // 모든 날씨 요청을 가로채므로 API 키나 외부 서비스가 필요하지 않다.
    await context.route('**/v1/weather/**', async (route) => {
      if (new URL(route.request().url()).pathname !== '/v1/weather/core') {
        await route.abort('failed');
      } else if (failWeather) {
        failedRequests += 1;
        await route.abort('internetdisconnected');
      } else {
        await route.fulfill({ json: mockOpenWeatherCoreWeatherFixture });
      }
    });
    await page.clock.setFixedTime(now);
    await page.addInitScript(
      ({ key, data }) => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify({ version: 1, data }));
        }
      },
      { key: storageKeys.favorites, data: [favorite] }
    );
    await page.goto('/favorites');
    const card = page.getByRole('button', { name: '서울 날씨 보기' });
    await expect(card).toContainText('17°');
    // 앱이 실제 조회 결과를 저장했는지 확인한다. 스냅샷 자체를 주입하지 않는다.
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, id }) =>
            JSON.parse(localStorage.getItem(key) ?? '{}').data?.[id]?.fetchedAt,
          { key: storageKeys.weatherSnapshots, id: locationId }
        )
      )
      .toBe(now.toISOString());
    await page.waitForLoadState('networkidle');

    failWeather = true;
    await page.clock.setFixedTime(
      new Date(now.getTime() + ageMinutes * 60_000)
    );
    // 문서 재로드로 QueryClient를 버려 영속 저장소만 폴백에 쓸 수 있게 한다.
    await page.reload();
    await expect.poll(() => failedRequests).toBeGreaterThanOrEqual(2);
    if (expired) {
      await expect(
        page.getByText('날씨 정보를 불러오지 못했습니다')
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: '다시 시도', exact: true })
      ).toBeVisible();
      await expect(card).toHaveCount(0);
    } else {
      await expect(card).toContainText('17°');
      await expect(card).toContainText('매우 오래된 정보');
      await expect(
        page.getByRole('button', { name: '다시 시도', exact: true })
      ).toHaveCount(0);
    }
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    try {
      await expect(page.getByRole('alert')).toContainText('오프라인 상태');
      if (expired) {
        await expect(
          page.getByText('오프라인 상태입니다', { exact: true })
        ).toBeVisible();
        await expect(card).toHaveCount(0);
      } else {
        await expect(card).toBeEnabled();
        await expect(card).toContainText('17°');
        await expect(card).toContainText('매우 오래된 정보');
      }
      await testInfo.attach('스냅샷-오프라인', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    } finally {
      await context.setOffline(false);
    }
    if (!expired) {
      await card.click();
      await expect(page).toHaveURL(`/location/${locationId}`);
      await page.waitForLoadState('networkidle');
    }
  });
}
