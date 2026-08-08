# Service Worker App Shell & Asset Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a runtime-caching Service Worker so an offline page _refresh_ boots the app shell + static assets, without caching any weather API data.

**Architecture:** A hand-written classic `public/sw.js` (served verbatim at `/sw.js`, root scope) does runtime caching only — cache-first for hashed same-origin `/assets/*`, network-first-with-same-URL-fallback for stable same-origin WebP sketches and navigations, and browser passthrough for cross-origin override WebP and `/v1/*`. CacheStorage reads and writes are best-effort so storage failures do not block successful network responses, and failed cache fallback preserves the original network error. It is registered from the existing `AppEffects` client-effects component in production only. Conservative activation (no `skipWaiting`) migrates versioned cache entries before cleanup. React Router's lazy `/__manifest` fetch is removed via `routeDiscovery: { mode: 'initial' }`.

**Tech Stack:** React Router 7.14 (SSR, `@vercel/react-router`), Vite 8, TypeScript, Vitest, Playwright, service worker Cache API.

## Global Constraints

- **No SW caching of `/v1/*`** — the versioned snapshot store is the sole arbiter of "data OK to show" (AGENTS.md: "Do not persist TanStack Query cache across sessions").
- Snapshot cutoffs unchanged (weather 24h / AQI 12h).
- Conventional Commits; **commit messages, code comments, docs in Korean**; this plan/spec stays English.
- Run binaries with `pnpm exec`, never `npx`.
- No commits to `main`/`release/*`; work in a `git worktree` off `origin/main`.
- Pre-commit hook runs `pnpm typecheck && pnpm lint && lint-staged && pnpm test` (full vitest) — a fresh worktree MUST `pnpm install` before the first commit.
- FSD boundaries: reusable SW registration logic lives in `frontend/shared/`.
- Link PR to issue #78; describe scope/non-scope, spec alignment, tests run, risks/rollback (AGENTS.md PR rules).
- This plan remains scoped to issue #78; issue #127 boundaries are out of scope.

---

## Setup (execution preflight — not a code task)

- [ ] Create the worktree off the freshly-fetched base and install deps:

```bash
git fetch origin
# via superpowers:using-git-worktrees (or native EnterWorktree; rename branch to feat/78-... if the tool prefixes "worktree-")
# target branch: feat/78-service-worker-app-shell
pnpm install            # required — pre-commit runs the full suite
```

- [ ] Copy this plan into the worktree and commit it first:

```bash
# place at docs/superpowers/plans/2026-08-08-issue-78-service-worker-app-shell-cache.md
git add docs/superpowers/plans/2026-08-08-issue-78-service-worker-app-shell-cache.md
git commit -m "docs(pwa): #78 서비스 워커 앱 셸 캐시 구현 계획 추가"
```

---

## Task 1: Remove `/__manifest` lazy route discovery

Removes RR7's runtime `/__manifest` fetch (inlines the route manifest). Simplifies the SW (no `/__manifest` handling), removes a known E2E flakiness source, and makes the offline shell independent of a cached manifest.

**Files:**

- Modify: `react-router.config.ts`
- Test: `tests/route-discovery.e2e.ts` (create)

**Interfaces:**

- Produces: no runtime `/__manifest` request on initial load.

- [ ] **Step 1: Write the failing test**

```ts
// tests/route-discovery.e2e.ts
import { test, expect } from './fixtures';

// routeDiscovery: 'initial'이면 RR7이 마운트 시 /__manifest를 요청하지 않는다.
test('초기 로드에서 /__manifest를 요청하지 않는다', async ({ page }) => {
  const manifestRequests: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/__manifest') {
      manifestRequests.push(req.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(manifestRequests).toEqual([]);
});
```

- [ ] **Step 2: Run it, expect FAIL** (initial load currently fetches `/__manifest`)

Run: `pnpm exec playwright test tests/route-discovery.e2e.ts`
Expected: FAIL — `manifestRequests` is non-empty.

- [ ] **Step 3: Add the config**

```ts
// react-router.config.ts
import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  // 지연 라우트 탐색(/__manifest fetch)을 끄고 전체 라우트 매니페스트를 초기 HTML에
  // 인라인한다. 라우트가 소수라 페이로드 비용은 무시할 수준이며, 오프라인 셸이
  // 캐시된 매니페스트에 의존하지 않게 되고 /__manifest 경쟁 상태도 사라진다.
  routeDiscovery: { mode: 'initial' },
  presets: [vercelPreset()],
} satisfies Config;
```

Note: verify `routeDiscovery` is accepted by the installed `@react-router/dev` 7.14 `Config` type via `pnpm typecheck`. If the dev suite proves flaky in dev mode, move this spec to the PWA (prod-build) config in Task 5.

- [ ] **Step 4: Run test + typecheck, expect PASS**

Run: `pnpm typecheck && pnpm exec playwright test tests/route-discovery.e2e.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add react-router.config.ts tests/route-discovery.e2e.ts
git commit -m "feat(router): #78 라우트 지연 탐색 비활성화(routeDiscovery: initial)"
```

---

## Task 2: Service worker registration (helper + wiring)

A pure, unit-tested registration helper in `shared/`, called from `AppEffects` in production only.

**Files:**

- Create: `frontend/shared/pwa/register.ts`
- Test: `tests/shared/pwa/register.test.ts` (create)
- Modify: `frontend/app/providers/app-effects.tsx`

**Interfaces:**

- Produces: `registerServiceWorker({ serviceWorker, enabled, scriptUrl? }): void` — registers `scriptUrl` (default `/sw.js`) only when `enabled` and `serviceWorker` are truthy; registration failure is swallowed (SW is an enhancement).

- [ ] **Step 1: Write the failing test**

```ts
// tests/shared/pwa/register.test.ts
import { describe, it, expect, vi } from 'vitest';
import { registerServiceWorker } from '~/shared/pwa/register';

describe('registerServiceWorker', () => {
  it('enabled이고 지원될 때 /sw.js를 등록한다', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    registerServiceWorker({
      serviceWorker: { register } as unknown as ServiceWorkerContainer,
      enabled: true,
    });
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('enabled=false(개발)에서는 등록하지 않는다', () => {
    const register = vi.fn();
    registerServiceWorker({
      serviceWorker: { register } as unknown as ServiceWorkerContainer,
      enabled: false,
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('serviceWorker 미지원 환경에서는 조용히 넘어간다', () => {
    expect(() =>
      registerServiceWorker({ serviceWorker: undefined, enabled: true })
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`register.ts` does not exist)

Run: `pnpm exec vitest run tests/shared/pwa/register.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// frontend/shared/pwa/register.ts
// 서비스 워커 등록. 프로덕션 빌드에서만, 브라우저가 지원할 때만 등록한다.
// 개발 서버에는 빌드된 sw.js가 없고, 개발 중 서비스 워커 캐시는 오히려 방해가 되므로
// 제외한다. 등록 실패는 앱 동작을 막지 않는다 — 서비스 워커는 향상일 뿐이다.
export interface RegisterServiceWorkerOptions {
  serviceWorker: ServiceWorkerContainer | undefined;
  enabled: boolean;
  scriptUrl?: string;
}

export function registerServiceWorker({
  serviceWorker,
  enabled,
  scriptUrl = '/sw.js',
}: RegisterServiceWorkerOptions): void {
  if (!enabled || !serviceWorker) return;
  void serviceWorker.register(scriptUrl).catch(() => {
    // 조용히 무시: 등록 실패 시 앱은 네트워크 직접 fetch로 정상 동작한다.
  });
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm exec vitest run tests/shared/pwa/register.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into `AppEffects`**

```tsx
// frontend/app/providers/app-effects.tsx
import { useEffect } from 'react';
import { useOnlineRecovery } from '~/features/app-bootstrap/use-online-recovery';
import { registerServiceWorker } from '~/shared/pwa/register';

// 앱 전역 사이드이펙트를 처리합니다. QueryClient와 ActiveLocation 컨텍스트 안에서 마운트됩니다.
export function AppEffects() {
  useOnlineRecovery();

  // 프로덕션 빌드에서만 서비스 워커를 등록한다. dev 서버에는 빌드된 sw.js가 없다.
  useEffect(() => {
    registerServiceWorker({
      serviceWorker:
        typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
      enabled: import.meta.env.PROD,
    });
  }, []);

  return null;
}
```

- [ ] **Step 6: Typecheck + lint + unit suite, expect PASS**

Run: `pnpm typecheck && pnpm lint && pnpm exec vitest run`
Expected: PASS (existing offline unit tests stay green).

- [ ] **Step 7: Commit**

```bash
git add frontend/shared/pwa/register.ts tests/shared/pwa/register.test.ts frontend/app/providers/app-effects.tsx
git commit -m "feat(pwa): #78 프로덕션에서 서비스 워커 등록"
```

---

## Task 3: The service worker (`public/sw.js`)

Classic script, runtime caching only. Verified end-to-end by the Task 5 smoke; ESLint needs a service-worker-globals override so `pnpm lint` stays clean.

**Files:**

- Create: `public/sw.js`
- Modify: `eslint.config.ts` (override for `public/sw.js`)
- Test: `tests/service-worker.test.ts`

**Interfaces:**

- Produces: `/sw.js` serving `weatherpane-app-shell-v1` (navigations) and `weatherpane-assets-v1` (hashed same-origin `/assets/*`, stable same-origin `*.webp`); cross-origin override WebP and `/v1/*` are untouched.

- [ ] **Step 1: Write the failing service-worker contract tests**

Create `tests/service-worker.test.ts` with an in-memory Cache API and VM-loaded worker. Cover activation migration before cleanup (including descending previous-version priority and rejection before cleanup or `clients.claim()` on a failed copy), cached hashed `/assets/*` cache-first behavior, same-origin WebP network-first cache refresh, CacheStorage open/match/put failures, and original-network-error preservation. Make the fetch harness expose whether `respondWith` was called, then assert that same-origin `/v1/*` GET and cross-origin WebP GET requests remain browser passthrough.

Run: `pnpm exec vitest run tests/service-worker.test.ts`
Expected: FAIL before `public/sw.js` implements cache migration, fail-safe CacheStorage handling, and the final request routing.

- [ ] **Step 2: Write the service worker**

```js
// public/sw.js
// Weatherpane 서비스 워커 — 앱 셸/정적 에셋 런타임 캐시 (이슈 #78).
// 날씨 API(/v1/*)는 캐시하지 않는다 — 스냅샷 저장소가 "보여줘도 되는 데이터"의 유일한
// 판단 주체다. 파일명이 빌드마다 해시로 바뀌므로 사전 캐시 대신 런타임에 실제 URL로
// 캐시한다.

// 캐시 버전. 전략이나 대상이 바뀌면 숫자를 올린다. activate에서 이 목록에 없는
// weatherpane- 캐시는 삭제한다.
const APP_SHELL_CACHE = 'weatherpane-app-shell-v1';
const ASSET_CACHE = 'weatherpane-assets-v1';
const EXPECTED_CACHES = [APP_SHELL_CACHE, ASSET_CACHE];

// 설치: skipWaiting을 호출하지 않는다. 새 워커는 대기 상태로 두었다가 기존 탭이 모두
// 사라진 뒤 다음 내비게이션에서 제어권을 넘겨받는다. 이렇게 해야 새 HTML을 옛 캐시된
// 청크와 섞어 내보내는 사고를 피한다.
self.addEventListener('install', () => {});

// 같은 종류의 이전 캐시는 높은 버전부터 읽어 현재 캐시에 없는 항목만 옮긴다. 새 워커가
// 활성화되기 전에 이전 버전의 런타임 캐시를 비워 오프라인 폴백을 잃지 않게 한다.
function previousCacheNames(names, currentCache) {
  const prefix = currentCache.replace(/\d+$/, '');
  return names
    .map((name) => {
      const match = name.match(new RegExp(`^${prefix}(\\d+)$`));
      return match && name !== currentCache
        ? { name, version: Number(match[1]) }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.version - left.version)
    .map(({ name }) => name);
}

async function migrateCacheEntries(sourceName, targetName) {
  const source = await caches.open(sourceName);
  const target = await caches.open(targetName);
  const requests = await source.keys();

  for (const request of requests) {
    if (await target.match(request)) continue;
    const response = await source.match(request);
    if (response) await target.put(request, response.clone());
  }
}

// 활성화: 이전 앱 셸/에셋 캐시의 항목을 현재 캐시에 무손실로 옮긴 뒤 오래된
// weatherpane- 캐시를 정리하고, 열려 있는 클라이언트의 제어권을 가져온다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      for (const name of previousCacheNames(names, APP_SHELL_CACHE)) {
        await migrateCacheEntries(name, APP_SHELL_CACHE);
      }
      for (const name of previousCacheNames(names, ASSET_CACHE)) {
        await migrateCacheEntries(name, ASSET_CACHE);
      }
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith('weatherpane-') && !EXPECTED_CACHES.includes(name)
          )
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// 캐시 우선: 캐시에 있으면 그대로, 없으면 네트워크로 받아 캐시에 넣는다. 내용이 안정적인
// 정적 에셋(해시된 /assets/*)에 쓴다.
async function cacheFirst(event, cacheName, request) {
  let cache;
  try {
    cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // CacheStorage 읽기 실패는 네트워크 요청을 막지 않는다.
  }
  const response = await fetch(request);
  // 동일 출처 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). 교차 출처
  // (opaque) 응답 — 예: 향후 원격 매니페스트 override URL — 은 매번 새로 받고 오프라인
  // 캐시에 넣지 않는다. opaque 응답은 status가 0이라 교차 출처 404를 성공과 구분할 수
  // 없어, 영구 캐시에 넣으면 안 되기 때문이다.
  // waitUntil로 워커 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
  if (response && response.status === 200) {
    // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
    // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
    try {
      // 응답 본문이 반환 과정에서 소비되기 전에 캐시용 복제본을 만든다.
      const responseForCache = response.clone();
      const cacheReady = cache
        ? Promise.resolve(cache)
        : caches.open(cacheName);
      event.waitUntil(
        cacheReady
          .then((target) => target.put(request, responseForCache))
          .catch(() => {})
      );
    } catch {
      // 캐시 쓰기 준비 실패도 네트워크 응답을 막지 않는다.
    }
  }
  return response;
}

// 네트워크 우선: 네트워크가 되면 최신 응답으로 캐시를 갱신해 반환하고, 실패하면 같은
// URL의 캐시된 응답으로 폴백한다. 내비게이션(HTML 문서)에 써서, 오프라인에서 "이전에
// 열었던 페이지 새로고침" 시 앱 셸이 뜨게 한다.
async function networkFirst(event, cacheName, request) {
  try {
    const response = await fetch(request);
    // 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). waitUntil로 워커
    // 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
    if (response && response.status === 200) {
      // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
      // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
      try {
        // 응답 본문이 반환 과정에서 소비되기 전에 캐시용 복제본을 만든다.
        const responseForCache = response.clone();
        event.waitUntil(
          caches
            .open(cacheName)
            .then((cache) => cache.put(request, responseForCache))
            .catch(() => {})
        );
      } catch {
        // 캐시 쓰기 준비 실패도 네트워크 응답을 막지 않는다.
      }
    }
    return response;
  } catch (error) {
    try {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
    } catch {
      // CacheStorage 오류 대신 원래 네트워크 오류를 아래에서 다시 던진다.
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 날씨/지오코드/매니페스트 등 API는 서비스 워커가 건드리지 않는다.
  if (url.origin === self.location.origin && url.pathname.startsWith('/v1/')) {
    return;
  }

  // 동일 출처 정적 에셋(해시된 JS/CSS/폰트).
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, request));
    return;
  }

  // 동일 출처 스케치 등 webp 에셋: 네트워크 우선. 고정 URL도 새 번들을 배포할 때 최신
  // 그림으로 갱신하고, 오프라인에서는 이전 캐시로 폴백한다. 교차 출처 webp(예: 향후 원격
  // 매니페스트 override)는 이 분기를 타지 않고 브라우저 기본 fetch로 넘어가 ASSET_CACHE에
  // 들어가지 않는다 — 오프라인 에셋 캐시는 위 /assets/ 분기와 동일하게 동일 출처만
  // 대상으로 한다.
  if (url.origin === self.location.origin && url.pathname.endsWith('.webp')) {
    event.respondWith(networkFirst(event, ASSET_CACHE, request));
    return;
  }

  // 내비게이션(HTML 문서): 네트워크 우선 + 같은 URL 캐시 폴백.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, APP_SHELL_CACHE, request));
    return;
  }
});
```

- [ ] **Step 3: Add an ESLint override so `public/sw.js` lints clean**

`public/` is not gitignored, so `eslint.config.ts` lints `sw.js`; it needs service-worker globals (`self`, `caches`, `clients`, `fetch`) and script source type. Append this config object to the array in `eslint.config.ts`:

```ts
// public/sw.js는 서비스 워커 전역(self, caches, clients 등)을 쓰는 클래식 스크립트다.
{
  files: ['public/sw.js'],
  languageOptions: {
    sourceType: 'script',
    globals: { ...globals.serviceworker, ...globals.browser },
  },
},
```

- [ ] **Step 4: Run the worker contracts, lint, and format check**

Run: `pnpm exec vitest run tests/service-worker.test.ts && pnpm lint && pnpm exec prettier --check public/sw.js`
Expected: no errors. (If prettier reports formatting, run `pnpm exec prettier --write public/sw.js`.)

- [ ] **Step 5: Commit**

```bash
git add public/sw.js eslint.config.ts tests/service-worker.test.ts
git commit -m "feat(pwa): #78 앱 셸·에셋 런타임 캐시 서비스 워커 추가"
```

---

## Task 4: `/sw.js` cache header (`vercel.json`)

Ensures SW updates propagate immediately (best practice: never long-cache the SW script). No `vercel.json` exists today.

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Create the file**

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify it doesn't break the build**

Run: `VITE_WEATHER_PROVIDER_MODE=mock pnpm build`
Expected: build succeeds; `build/client/sw.js` exists. (A headers-only `vercel.json` is additive to the `@vercel/react-router` Build Output; confirm the build result still emits the server bundle. If the preset rejects a root `vercel.json`, fall back to serving the header from the SSR server and note it in the journal.)

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore(pwa): #78 /sw.js에 no-cache 헤더 지정"
```

---

## Task 5: Offline app-shell smoke (production-build Playwright)

The SW only exists in the production build, and the main Playwright `webServer` runs `pnpm dev`. Add an isolated config that builds + serves production and runs only the SW smoke; exclude that spec from the main suite.

**Files:**

- Create: `playwright.pwa.config.ts`
- Create: `tests/service-worker-offline.pwa.e2e.ts`
- Modify: `playwright.config.ts` (ignore `*.pwa.e2e.ts`)
- Modify: `package.json` (add `test:e2e:pwa` script)

**Interfaces:**

- Consumes: `/sw.js` + registration (Tasks 2–3), `routeDiscovery: 'initial'` (Task 1).

- [ ] **Step 1: Exclude the PWA spec from the main config**

Read `playwright.config.ts`; add `testIgnore: ['**/*.pwa.e2e.ts']` next to its existing `testMatch`. This keeps the dev-server suite from running the prod-only SW spec.

- [ ] **Step 2: Create the PWA config**

```ts
// playwright.pwa.config.ts
// 서비스 워커는 프로덕션 빌드에서만 산출된다. dev 서버(메인 e2e)에는 없으므로, SW 스모크는
// 프로덕션 빌드를 만들어 serve한 뒤 별도로 실행한다.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.pwa.e2e.ts'],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `VITE_WEATHER_PROVIDER_MODE=mock pnpm build && PORT=${PORT} node ./scripts/serve-production-build.js`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Verify `scripts/serve-production-build.js` honors `PORT` and is reachable at `127.0.0.1` (react-router-serve reads `PORT`). Adjust the port/host if the serve script differs.

- [ ] **Step 3: Write the smoke spec**

```ts
// tests/service-worker-offline.pwa.e2e.ts
import { test, expect } from './fixtures';

// 서비스 워커가 앱 셸/에셋을 캐시하면, 이전에 연 적 있는 페이지는 오프라인 새로고침에서도
// 부팅된다. SW는 "이미 제어 중인" 로드에서만 런타임 캐시를 채우므로(첫 방문에는 아직
// 제어권이 없다), 오프라인 전환 전에 온라인으로 한 번 더 새로고침해 캐시를 채운다 —
// 이는 표준 PWA 동작이며 실제 2회차 방문과 동일하다.
test.describe('서비스 워커 오프라인 앱 셸', () => {
  test('오프라인 새로고침에도 앱 셸이 부팅된다', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => !!navigator.serviceWorker?.controller,
      null,
      {
        timeout: 15_000,
      }
    );

    // SW가 제어하는 상태에서 한 번 더 로드해 셸/에셋 캐시를 채운다.
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 오프라인 전환 후 새로고침 — 전부 캐시에서 제공되어야 한다.
    await context.setOffline(true);
    await page.reload();

    // 앱이 하이드레이트되어 오프라인을 감지하면 배너(role="alert")가 뜬다. 브라우저
    // 오프라인 오류 페이지였다면 이 배너는 존재하지 않는다.
    await expect(page.getByRole('alert')).toContainText('오프라인 상태', {
      timeout: 15_000,
    });

    await context.setOffline(false);
  });

  test('고정 URL 스케치는 온라인 재검증 뒤 오프라인에 최신 캐시를 쓴다', async ({
    page,
    context,
  }) => {
    const sketchPath = '/sketches/hub/seoul/clear-day.webp';

    await page.goto('/');
    await page.waitForFunction(
      () => !!navigator.serviceWorker?.controller,
      null,
      {
        timeout: 15_000,
      }
    );

    await page.evaluate(async (path) => {
      const cache = await caches.open('weatherpane-assets-v1');
      await cache.put(
        path,
        new Response('오래된 스케치', {
          headers: { 'content-type': 'text/plain' },
        })
      );
    }, sketchPath);

    const onlineResponse = await page.evaluate(async (path) => {
      const response = await fetch(path);
      return {
        contentType: response.headers.get('content-type'),
        byteLength: (await response.arrayBuffer()).byteLength,
      };
    }, sketchPath);

    expect(onlineResponse.contentType).toContain('image/webp');
    expect(onlineResponse.byteLength).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(async (path) => {
          const cached = await (
            await caches.open('weatherpane-assets-v1')
          ).match(path);
          return cached
            ? {
                contentType: cached.headers.get('content-type'),
                byteLength: (await cached.arrayBuffer()).byteLength,
              }
            : null;
        }, sketchPath)
      )
      .toEqual(onlineResponse);

    await context.setOffline(true);
    try {
      const offlineResponse = await page.evaluate(async (path) => {
        const response = await fetch(path);
        return {
          contentType: response.headers.get('content-type'),
          byteLength: (await response.arrayBuffer()).byteLength,
        };
      }, sketchPath);

      expect(offlineResponse).toEqual(onlineResponse);
    } finally {
      await context.setOffline(false);
    }
  });
});
```

- [ ] **Step 4: Add the script to `package.json`**

```json
"test:e2e:pwa": "playwright test --config playwright.pwa.config.ts"
```

- [ ] **Step 5: Run the smoke, expect PASS**

Run: `pnpm test:e2e:pwa`
Expected: PASS (validates Tasks 1–4 end-to-end): the app-shell case reloads offline after a service-worker-controlled online reload, and the stable `/sketches/hub/seoul/clear-day.webp` case seeds `오래된 스케치`, refreshes online to a non-empty `image/webp` response, then returns that same cached response offline. If it fails at the controller wait, confirm registration ran in the built app; if it fails after offline reload, confirm assets were cached on the online reload (the second load must go through the SW).

- [ ] **Step 6: Confirm the main suite still passes (regression for Task 1)**

Run: `pnpm test:e2e`
Expected: PASS, and it does not pick up `*.pwa.e2e.ts`.

- [ ] **Step 7: Commit**

```bash
git add playwright.pwa.config.ts playwright.config.ts tests/service-worker-offline.pwa.e2e.ts package.json
git commit -m "test(pwa): #78 프로덕션 빌드 오프라인 앱 셸 스모크 추가"
```

---

## Task 6: Documentation (same PR)

Reflect that the SW is now implemented; keep `docs/` current (AGENTS.md).

**Files:**

- Modify: `docs/specs.md` (P1 SW row + status notes)
- Modify: `docs/legacy/service-worker-caching-design.md` (front-matter `replaced_by`)
- Create: `docs/journal/journal-issue-78-service-worker.md`

- [ ] **Step 1: Update `docs/specs.md`**

Change the P1 Service Worker row (≈line 39) and the SW bullet (≈line 161) from "미구현 — 차기 범위" to implemented, describing the shipped subset: app-shell + asset runtime cache (`weatherpane-app-shell-v1`, `weatherpane-assets-v1`), cache-first assets / network-first navigations, `/v1/*` intentionally uncached. Note the implemented scope excludes `cache-http`, PWA manifest, and Periodic Background Sync. Leave the preserved diagrams unchanged, but update the "구현 상태" prose notes (≈lines 165, 206) to say the SW participant is now implemented for app shell/assets (not for weather data).

- [ ] **Step 2: Update the legacy design front matter**

In `docs/legacy/service-worker-caching-design.md`, set `replaced_by` to reference issue #78 and the updated `docs/specs.md` SW section (the app-shell/asset subset is now implemented; `cache-http` remains unimplemented by design).

- [ ] **Step 3: Write the journal entry**

Create `docs/journal/journal-issue-78-service-worker.md` recording: the six decisions (hand-written SW vs Workbox and why; strategy table; no-`skipWaiting`; `routeDiscovery: initial`; register from `AppEffects`; `vercel.json` header), the **two-load caching characteristic** (offline refresh reliably boots only after the SW has controlled one full load), the prod-build e2e config, and the agreed **follow-up** (Favorites offline snapshot fallback).

- [ ] **Step 4: Commit**

```bash
git add docs/specs.md docs/legacy/service-worker-caching-design.md docs/journal/journal-issue-78-service-worker.md
git commit -m "docs(pwa): #78 서비스 워커 구현 반영 및 저널 기록"
```

---

## Final verification (before PR)

- [ ] `pnpm lint && pnpm typecheck && pnpm exec vitest run` — all green.
- [ ] `pnpm exec vitest run tests/service-worker.test.ts` — cache migration and request-routing contract green.
- [ ] `VITE_WEATHER_PROVIDER_MODE=mock pnpm build` — `build/client/sw.js` present, `/assets/*` hashed chunks present.
- [ ] `pnpm test:e2e` — main suite green (routeDiscovery regression).
- [ ] `pnpm test:e2e:pwa` — offline app-shell smoke green.
- [ ] Manual (optional): `pnpm preview`, Chrome DevTools → Application: `/sw.js` activated, Cache Storage shows both caches; toggle Offline + reload → shell boots, honest fallback (snapshot or connection-error) shows.

## PR

Open a PR linking #78. Scope: app-shell + asset runtime cache, SW registration, `routeDiscovery: initial`, `/sw.js` header, prod-build offline smoke, docs. Non-scope: `/v1/*` SW caching, snapshot cutoff changes, PWA manifest/add-to-home-screen, Periodic Background Sync, Favorites offline snapshot (follow-up). Risks: `routeDiscovery` behavior change (mitigated by regression run); `vercel.json` interaction with the preset (verified in Task 4); two-load caching characteristic (documented). Rollback: revert the branch; SW is registered PROD-only and fails safe (app works via direct network fetch if the SW is absent).

## Follow-up (file after PR opens — agreed with Ori)

```bash
gh issue create \
  --title "feat(favorites): 오프라인 카드에 영속 날씨 스냅샷 fallback 도입" \
  --label "type:feature,area:favorites" \
  --body "이슈 #78로 오프라인 새로고침 시 앱 셸이 부팅되면서, 즐겨찾기 카드가 오프라인에서 도달 가능해졌다. 현재 favorite-card.tsx는 세션 내 useCoreWeather만 사용해(영속 스냅샷 없음) 오프라인에서 CardError를 표시한다. Home/Detail과 동일하게 24h 영속 날씨 스냅샷 fallback을 주어, 오프라인 즐겨찾기가 stale 카드로 정직하게 저하되도록 한다. 참고: docs/legacy/service-worker-caching-design.md, #78."
```
