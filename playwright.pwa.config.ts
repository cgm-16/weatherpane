// 서비스 워커는 프로덕션 빌드에서만 산출된다. dev 서버(메인 e2e)에는 없으므로, SW 스모크는
// 프로덕션 빌드를 만들어 serve한 뒤 별도로 실행한다.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.pwa.e2e.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `VITE_WEATHER_PROVIDER_MODE=mock pnpm build && PORT=${PORT} node ./scripts/serve-production-build.js`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
