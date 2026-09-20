import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const providerPort = 4175;

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.e2e.ts'],
  // 서비스 워커 스모크는 프로덕션 빌드에서만 유효하다. dev 서버로 도는 이 메인
  // 스위트에서는 제외하고, playwright.pwa.config.ts가 프로덕션 빌드로 따로 실행한다.
  testIgnore: ['**/*.pwa.e2e.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // 병렬 테스트 실행 중 React 하이드레이션 지연을 고려한 단언 타임아웃
  expect: { timeout: 10000 },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/*.pwa.e2e.ts', '**/*.provider.e2e.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'weather-provider',
      testMatch: ['**/*.provider.e2e.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${providerPort}`,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm dev --host 127.0.0.1 --port ${port} --strictPort`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_WEATHER_PROVIDER_MODE: 'mock',
      },
    },
    {
      // HTTP provider의 응답은 테스트가 가로챈다. SSR과 클라이언트 모드를 일치시킨다.
      command: `pnpm dev --host 127.0.0.1 --port ${providerPort} --strictPort`,
      url: `http://127.0.0.1:${providerPort}`,
      reuseExistingServer: false,
      env: { VITE_WEATHER_PROVIDER_MODE: 'real', OPENWEATHER_API_KEY: '' },
    },
  ],
});
