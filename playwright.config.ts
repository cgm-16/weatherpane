import { defineConfig, devices } from '@playwright/test';

const port = 4173;

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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_WEATHER_PROVIDER_MODE: 'mock',
    },
  },
});
