# OpenWeather Proxy Quota Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the three OpenWeather proxy loaders (`/v1/weather/core`, `/v1/weather/aqi`, `/v1/geocode`) from request-rate abuse and quota exhaustion, and stop any hop from hanging forever — without changing the existing error contract or client UX.

**Architecture:** In-repo code (this plan) adds fetch timeouts on both proxy hops, CDN cache headers aligned to the existing staleTime policy, lat/lon rounding to shrink the cache-key space, and upstream-429 logging. Rate limiting itself is a Vercel WAF `rate_limit` rule that lives in Vercel's control plane — staged via CLI and published by Ori (see the Operational Rollout appendix), documented in-repo as the source of truth.

**Tech Stack:** React Router 7 (SSR loaders → Vercel Functions via `@vercel/react-router` preset), TypeScript, Vitest, Vercel Firewall (WAF).

## Global Constraints

- **Isolation:** work in a git worktree branched off `main`; branch `chore/weather-proxy-quota-protection` (verify the actual branch name after worktree creation — the harness may prefix it). Never commit to `main`.
- **Fresh worktree setup:** run `pnpm install` in the worktree **before any commit** — the husky pre-commit hook runs prettier + `tsc` typecheck + the **full** vitest suite, which needs `node_modules`.
- **Error contract is frozen:** the only proxy error codes are `INVALID_PROVIDER_RESPONSE` (502, or upstream status passthrough on non-2xx) and `PROVIDER_NOT_IMPLEMENTED` (501). A timeout maps to `INVALID_PROVIDER_RESPONSE`. Do not add new codes or statuses.
- **Timeout constants:** server→OpenWeather `UPSTREAM_TIMEOUT_MS = 5_000`; client→proxy `PROXY_TIMEOUT_MS = 8_000` (client > server so the server's clean 502 usually wins; client timeout is the backstop for a hung function).
- **Rounding:** 2 decimal places (~1.1 km), `Math.round(value * 100) / 100`. Precision is not safety-critical — no epsilon handling needed.
- **Cache TTLs (`s-maxage` = `stale-while-revalidate`):** core `600` (10 m, matches weather staleTime), aqi `1800` (30 m, matches AQI staleTime), geocode `86400` (1 day, name→coords is near-static). Always `public, max-age=0` so TanStack Query still governs the browser. **Only 2xx responses are cacheable; every error response sets `Cache-Control: no-store`.**
- **Tests must not wait in real time:** timeout tests use `vi.useFakeTimers()` + an abort-aware `fetch` mock (a promise that rejects when `init.signal` fires `abort`) and `vi.advanceTimersByTimeAsync(...)`. The pre-commit hook runs the full suite on every commit — a real 5–8 s wait per test is unacceptable.
- **DRY note (decided, don't re-litigate):** the AbortController boilerplate is duplicated across the two hops on purpose — a shared helper is rejected because the server hop returns a `Response` and the client hop throws a `WeatherProviderError`; the divergent error mapping makes a shared abstraction less readable than the ~6 duplicated lines. The abort must span `response.json()` (keep it inside the `try` that `finally { clearTimeout }` guards) — this is the bug the reference `fetch-remote-manifest.ts` has and we do NOT copy.
- **Language:** code comments, commit messages, and the operational doc in Korean; `docs/skills/*` stays English. Conventional Commits (`chore(weather): …`, `test(weather): …`, `docs(weather): …`), each ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: `roundCoordinate` shared helper

**Files:**

- Create: `frontend/shared/lib/round-coordinate.ts`
- Test: `tests/shared/lib/round-coordinate.test.ts`

**Interfaces:**

- Produces: `roundCoordinate(value: number): number` — rounds to 2 decimal places.

- [ ] **Step 1: Write the failing test**

```ts
// tests/shared/lib/round-coordinate.test.ts
import { describe, expect, test } from 'vitest';

import { roundCoordinate } from '../../../frontend/shared/lib/round-coordinate';

describe('roundCoordinate', () => {
  test.each([
    [37.5729, 37.57],
    [126.9794, 126.98],
    [37.5, 37.5],
    [127, 127],
    [-33.8688, -33.87],
  ] as const)('rounds %s to %s (2 decimals)', (input, expected) => {
    expect(roundCoordinate(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/shared/lib/round-coordinate.test.ts`
Expected: FAIL — cannot resolve `frontend/shared/lib/round-coordinate`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/shared/lib/round-coordinate.ts
// 위경도를 소수점 2자리(~1.1km)로 반올림한다. 인접 좌표를 같은 CDN 캐시 키/업스트림
// 호출로 모으고, 프록시로 전달되는 좌표 정밀도를 제한하기 위한 헬퍼.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/shared/lib/round-coordinate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/shared/lib/round-coordinate.ts tests/shared/lib/round-coordinate.test.ts
git commit -m "$(cat <<'EOF'
feat(weather): 위경도 2자리 반올림 헬퍼 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Server hop — timeout (spanning body read) + upstream-429 logging

**Files:**

- Modify: `frontend/shared/api/openweather-proxy.server.ts`
- Test: `tests/openweather-proxy-server.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `proxyOpenWeatherRequest(upstreamUrl: URL, errorMessage: string): Promise<Response>` — signature unchanged; now aborts after `UPSTREAM_TIMEOUT_MS` (spanning the JSON body read) and `console.warn`s on an upstream `429`.

- [ ] **Step 1: Add the `afterEach` timer reset + failing timeout test**

Add `vi.useRealTimers()` to the existing `afterEach`, then add:

```ts
// tests/openweather-proxy-server.test.ts — inside describe('proxyOpenWeatherRequest')
test('업스트림 응답이 타임아웃되면 502 INVALID_PROVIDER_RESPONSE를 반환한다', async () => {
  vi.useFakeTimers();
  vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
  // signal.abort 시 reject하는 fetch 목 — 실제 대기 없이 타임아웃을 시뮬레이션한다.
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        (init as RequestInit)?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      })
  );

  const promise = proxyOpenWeatherRequest(
    new URL('https://api.openweathermap.org/data/3.0/onecall'),
    '날씨 API 네트워크 오류가 발생했습니다'
  );
  await vi.advanceTimersByTimeAsync(5_000);
  const response = await promise;

  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.code).toBe('INVALID_PROVIDER_RESPONSE');
});

test('업스트림이 429를 반환하면 경고 로그를 남기고 상태를 그대로 전달한다', async () => {
  vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response('Too Many Requests', { status: 429 })
  );

  const response = await proxyOpenWeatherRequest(
    new URL('https://api.openweathermap.org/data/3.0/onecall'),
    '날씨 API 네트워크 오류가 발생했습니다'
  );

  expect(response.status).toBe(429);
  expect((await response.json()).code).toBe('INVALID_PROVIDER_RESPONSE');
  expect(warnSpy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify the timeout test fails**

Run: `pnpm exec vitest run tests/openweather-proxy-server.test.ts`
Expected: the timeout test FAILS (currently `fetch` has no `signal`, so `abort` never rejects and the test hangs until the vitest timeout) and the 429 test FAILS on `warnSpy` not called. Existing tests still PASS.

- [ ] **Step 3: Rewrite the fetch block with an AbortController spanning the body read**

Replace the body of `proxyOpenWeatherRequest` from the `let response` declaration onward (keep the `apiKey` guard and the `requestUrl`/`appid` block unchanged). Add the constant at the top of the file:

```ts
// 업스트림(OpenWeather) 응답이 느리거나 멈췄을 때 무한 대기를 막는 타임아웃.
const UPSTREAM_TIMEOUT_MS = 5_000;
```

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
try {
  const response = await fetch(requestUrl.toString(), {
    signal: controller.signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      // 업스트림 429 = OpenWeather 쿼터/요청 제한 소진 신호. Vercel Logs에서 관측 가능.
      console.warn(
        '[openweather-proxy] upstream returned 429 — quota/rate limit reached'
      );
    }
    return Response.json(
      {
        code: 'INVALID_PROVIDER_RESPONSE',
        message: `${errorMessage}: ${response.status}`,
      },
      { status: response.status }
    );
  }

  // response.json()도 같은 timeout/finally 범위 안에 두어야 본문 스트림이 멈춰도
  // 무한 대기하지 않는다.
  const data: unknown = await response.json();
  return Response.json(data);
} catch {
  // 타임아웃(abort)·네트워크 오류·JSON 파싱 실패를 모두 동일 경로로 매핑한다.
  return Response.json(
    { code: 'INVALID_PROVIDER_RESPONSE', message: errorMessage },
    { status: 502 }
  );
} finally {
  clearTimeout(timeoutId);
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `pnpm exec vitest run tests/openweather-proxy-server.test.ts`
Expected: PASS — including the two new tests and all pre-existing ones (200 passthrough, non-JSON→502, 401 passthrough, network→502, caller-URL-not-mutated).

- [ ] **Step 5: Commit**

```bash
git add frontend/shared/api/openweather-proxy.server.ts tests/openweather-proxy-server.test.ts
git commit -m "$(cat <<'EOF'
feat(weather): 프록시 서버 홉에 fetch 타임아웃과 업스트림 429 로깅 추가

- AbortController 타임아웃이 본문 읽기(response.json)까지 포함하도록 구성
- 타임아웃은 기존 INVALID_PROVIDER_RESPONSE/502 경로로 매핑 (계약 불변)
- OpenWeather 429 응답 시 관측용 console.warn

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Client hop — timeout + lat/lon rounding in `realWeatherProvider`

**Files:**

- Modify: `frontend/shared/api/real-weather-provider.ts`
- Test: `tests/weather-provider-adapters.test.ts`

**Interfaces:**

- Consumes: `roundCoordinate` from Task 1.
- Produces: `realWeatherProvider.getCoreWeather` / `getAqi` now send **rounded** lat/lon to the proxy; `fetchProxy` aborts after `PROXY_TIMEOUT_MS` (spanning the body read) and maps a timeout to `WeatherProviderError({ code: 'INVALID_PROVIDER_RESPONSE' })`. Normalization still uses the original (unrounded) `location`.

- [ ] **Step 1: Update the two existing param assertions + add the timeout test**

In `tests/weather-provider-adapters.test.ts`, import the helper at the top:

```ts
import { roundCoordinate } from '../frontend/shared/lib/round-coordinate';
```

Change the `getCoreWeather` param test (currently asserting `String(resolvedLocation.latitude)` / `.longitude`) to expect rounded values:

```ts
expect(calledUrl.searchParams.get('lat')).toBe(
  String(roundCoordinate(resolvedLocation.latitude))
);
expect(calledUrl.searchParams.get('lon')).toBe(
  String(roundCoordinate(resolvedLocation.longitude))
);
```

Make the identical change in the `getAqi` "프록시 엔드포인트에 lat/lon 파라미터로 요청" test. Then add, inside `describe('getCoreWeather')`:

```ts
test('프록시 응답이 타임아웃되면 INVALID_PROVIDER_RESPONSE 오류를 발생시킨다', async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        (init as RequestInit)?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      })
  );

  const promise = realWeatherProvider.getCoreWeather(resolvedLocation);
  const expectation = expect(promise).rejects.toMatchObject({
    code: 'INVALID_PROVIDER_RESPONSE',
  });
  await vi.advanceTimersByTimeAsync(8_000);
  await expectation;
  vi.useRealTimers();
});
```

(Confirm the `getCoreWeather` describe's `afterEach` calls `vi.restoreAllMocks()`; add `vi.useRealTimers()` there too if timers leak.)

- [ ] **Step 2: Run to verify new/edited tests fail**

Run: `pnpm exec vitest run tests/weather-provider-adapters.test.ts`
Expected: the two param tests FAIL (unrounded `37.5729`/`126.9794` ≠ rounded `37.57`/`126.98`) and the timeout test FAILS (no `signal` yet).

- [ ] **Step 3: Add rounding to the provider calls**

In `frontend/shared/api/real-weather-provider.ts`, import the helper and round the coordinates passed to `fetchProxy` in both `getCoreWeather` and `getAqi` (leave the `normalize…(…, location)` calls using the original `location`):

```ts
import { roundCoordinate } from '../lib/round-coordinate';
```

```ts
const data = await fetchProxy(
  '/v1/weather/core',
  {
    lat: String(roundCoordinate(location.latitude)),
    lon: String(roundCoordinate(location.longitude)),
  },
  '날씨 API 네트워크 오류가 발생했습니다'
);
```

(Same shape for `getAqi` with the `/v1/weather/aqi` path and its error message.)

- [ ] **Step 4: Add the timeout to `fetchProxy` (spanning body read)**

Add the constant near the top of the file:

```ts
// 프록시(우리 서버) 응답이 멈췄을 때 클라이언트가 무한 대기하지 않도록 하는 타임아웃.
// 서버 홉(5s)보다 길게 두어 서버의 정식 502가 먼저 반환되도록 한다.
const PROXY_TIMEOUT_MS = 8_000;
```

Rewrite `fetchProxy` so fetch + body read run under one AbortController, and a WeatherProviderError thrown inside is re-thrown as-is (only timeout/network wrap to INVALID):

```ts
async function fetchProxy(
  path: string,
  params: Record<string, string>,
  errorMessage: string
): Promise<unknown> {
  const query = new URLSearchParams(params);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(`${path}?${query.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as ProxyErrorBody | null;
      if (body?.code === 'PROVIDER_NOT_IMPLEMENTED') {
        throw new WeatherProviderError({
          code: 'PROVIDER_NOT_IMPLEMENTED',
          provider: 'openweather',
          message: body.message ?? errorMessage,
        });
      }
      throw new WeatherProviderError({
        code: 'INVALID_PROVIDER_RESPONSE',
        provider: 'openweather',
        message: `${errorMessage}: ${response.status}`,
      });
    }

    return await response.json();
  } catch (cause) {
    // 위 블록에서 던진 계약 오류는 그대로 전파한다.
    if (cause instanceof WeatherProviderError) {
      throw cause;
    }
    // 타임아웃(abort)·네트워크 오류·JSON 파싱 실패를 INVALID_PROVIDER_RESPONSE로 매핑.
    throw new WeatherProviderError({
      code: 'INVALID_PROVIDER_RESPONSE',
      provider: 'openweather',
      message: errorMessage,
      cause,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `pnpm exec vitest run tests/weather-provider-adapters.test.ts`
Expected: PASS — the two rounded-param tests, the new timeout test, and all pre-existing provider tests (PROVIDER_NOT_IMPLEMENTED passthrough, HTTP error → INVALID, non-JSON error body → INVALID, network → INVALID, valid normalization).

- [ ] **Step 6: Commit**

```bash
git add frontend/shared/api/real-weather-provider.ts tests/weather-provider-adapters.test.ts
git commit -m "$(cat <<'EOF'
feat(weather): 프록시 클라이언트 홉에 fetch 타임아웃과 좌표 반올림 추가

- fetchProxy에 8s AbortController 타임아웃(본문 읽기 포함), 타임아웃→INVALID_PROVIDER_RESPONSE
- getCoreWeather/getAqi가 프록시에 2자리 반올림 좌표를 전달해 CDN 캐시 키를 정규화
- 정규화는 원본 location 좌표를 그대로 사용 (표시값 불변)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Route loaders — CDN cache headers + server-side rounding

**Files:**

- Create: `frontend/shared/api/proxy-cache-control.ts`
- Test: `tests/shared/api/proxy-cache-control.test.ts`
- Modify: `app/routes/v1.weather.core.ts`, `app/routes/v1.weather.aqi.ts`, `app/routes/v1.geocode.ts`
- Test: `tests/routes/v1-weather-proxy-routes.test.ts`

**Interfaces:**

- Consumes: `proxyOpenWeatherRequest` (Task 2), `roundCoordinate` (Task 1).
- Produces: `applyProxyCacheControl(response: Response, sMaxAgeSeconds: number): Response` — sets `public, max-age=0, s-maxage=<n>, stale-while-revalidate=<n>` on 2xx responses and `no-store` on everything else; returns the same `Response`.

- [ ] **Step 1: Write the failing helper test**

```ts
// tests/shared/api/proxy-cache-control.test.ts
import { describe, expect, test } from 'vitest';

import { applyProxyCacheControl } from '../../../frontend/shared/api/proxy-cache-control';

describe('applyProxyCacheControl', () => {
  test('2xx 응답에 public s-maxage 헤더를 설정한다', () => {
    const response = applyProxyCacheControl(Response.json({ ok: true }), 600);
    const header = response.headers.get('Cache-Control');
    expect(header).toContain('public');
    expect(header).toContain('max-age=0');
    expect(header).toContain('s-maxage=600');
    expect(header).toContain('stale-while-revalidate=600');
  });

  test('오류 응답에는 no-store를 설정한다', () => {
    const response = applyProxyCacheControl(
      Response.json({ code: 'INVALID_PROVIDER_RESPONSE' }, { status: 502 }),
      600
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run tests/shared/api/proxy-cache-control.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// frontend/shared/api/proxy-cache-control.ts
// 프록시 성공 응답만 Vercel CDN이 공유 캐시하도록 s-maxage를 설정한다.
// 브라우저 신선도는 TanStack Query staleTime이 관리하므로 max-age=0으로 둔다.
// 오류 응답은 절대 캐시하지 않는다(no-store).
export function applyProxyCacheControl(
  response: Response,
  sMaxAgeSeconds: number
): Response {
  if (response.ok) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds}`
    );
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run tests/shared/api/proxy-cache-control.test.ts`
Expected: PASS. (If the runtime rejects mutating `response.headers`, rebuild instead: `new Response(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), 'Cache-Control': value } })` — but undici/Node allows `.set()`, so expect PASS.)

- [ ] **Step 5: Write failing loader tests (cache headers + server rounding)**

Add to `tests/routes/v1-weather-proxy-routes.test.ts` (within the relevant `describe` blocks):

```ts
// core
test('성공 응답에 s-maxage=600 캐시 헤더를 설정한다', async () => {
  vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    Response.json({ current: {} })
  );
  const response = await coreLoader({
    request: makeRequest('/v1/weather/core?lat=37.5&lon=127'),
  });
  expect(response.headers.get('Cache-Control')).toContain('s-maxage=600');
});

test('lat/lon 누락 시 no-store로 응답한다', async () => {
  const response = await coreLoader({
    request: makeRequest('/v1/weather/core'),
  });
  expect(response.status).toBe(400);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('lat/lon을 소수점 2자리로 반올림해 업스트림에 전달한다', async () => {
  vi.stubEnv('OPENWEATHER_API_KEY', 'test-key');
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ current: {} }));
  await coreLoader({
    request: makeRequest('/v1/weather/core?lat=37.5729&lon=126.9794'),
  });
  const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
  expect(calledUrl.searchParams.get('lat')).toBe('37.57');
  expect(calledUrl.searchParams.get('lon')).toBe('126.98');
});
```

Add the analogous `s-maxage=1800` cache test to the aqi `describe` and `s-maxage=86400` to the geocode `describe` (geocode has no rounding test — it takes `q`, not coords). Add a `no-store` missing-param test to aqi and geocode as well.

- [ ] **Step 6: Run to verify they fail**

Run: `pnpm exec vitest run tests/routes/v1-weather-proxy-routes.test.ts`
Expected: the cache-header and rounding tests FAIL; the existing tests (which use `lat=37.5&lon=127`, unaffected by 2-decimal rounding) still PASS.

- [ ] **Step 7: Update the three loaders**

For `app/routes/v1.weather.core.ts` — add imports, a cache constant, round the coords, and route every return through `applyProxyCacheControl`:

```ts
import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';
import { applyProxyCacheControl } from '../../frontend/shared/api/proxy-cache-control';
import { roundCoordinate } from '../../frontend/shared/lib/round-coordinate';

const CORE_CACHE_S_MAXAGE = 600;

export async function loader({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) {
    return applyProxyCacheControl(
      Response.json(
        {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'lat, lon 파라미터가 필요합니다.',
        },
        { status: 400 }
      ),
      CORE_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/3.0/onecall'
  );
  upstreamUrl.searchParams.set('lat', String(roundCoordinate(Number(lat))));
  upstreamUrl.searchParams.set('lon', String(roundCoordinate(Number(lon))));
  upstreamUrl.searchParams.set('exclude', 'minutely,alerts');
  upstreamUrl.searchParams.set('units', 'metric');

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    '날씨 API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, CORE_CACHE_S_MAXAGE);
}
```

Apply the same shape to `v1.weather.aqi.ts` (`AQI_CACHE_S_MAXAGE = 1800`, air_pollution URL, round lat/lon) and `v1.geocode.ts` (`GEOCODE_CACHE_S_MAXAGE = 86400`, no rounding — wrap the 400 and the proxy return through `applyProxyCacheControl`).

- [ ] **Step 8: Run tests to verify all pass**

Run: `pnpm exec vitest run tests/routes/v1-weather-proxy-routes.test.ts tests/shared/api/proxy-cache-control.test.ts`
Expected: PASS across new and pre-existing route tests.

- [ ] **Step 9: Commit**

```bash
git add frontend/shared/api/proxy-cache-control.ts tests/shared/api/proxy-cache-control.test.ts app/routes/v1.weather.core.ts app/routes/v1.weather.aqi.ts app/routes/v1.geocode.ts tests/routes/v1-weather-proxy-routes.test.ts
git commit -m "$(cat <<'EOF'
feat(weather): 프록시 라우트에 CDN 캐시 헤더와 서버측 좌표 반올림 추가

- 성공 응답만 s-maxage(core 600 / aqi 1800 / geocode 86400)로 공유 캐시, 오류는 no-store
- 두 날씨 라우트가 업스트림 호출 전 lat/lon을 2자리로 반올림
- applyProxyCacheControl 헬퍼로 캐시 로직을 라우트 경계에 일원화

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation — operational runbook + weather-skill reference

**Files:**

- Create: `docs/openweather-proxy-protection.md` (Korean)
- Modify: `docs/skills/weather-domain-contracts.md` (English)

**Interfaces:** none (docs only).

- [ ] **Step 1: Write `docs/openweather-proxy-protection.md`**

Korean operational doc, single source of truth for the control-plane rule. Sections:

- **배경 / 위협 모델:** #73이 만든 세 오픈 릴레이 프록시, 키 탈취 없는 쿼터 소진 위험.
- **적용된 코드 보호:** 타임아웃 값(서버 5s / 클라이언트 8s, 본문 읽기 포함, →`INVALID_PROVIDER_RESPONSE`), 캐시 TTL 계약(core 600 / aqi 1800 / geocode 86400, `max-age=0`, 오류 `no-store`), 좌표 반올림(2자리), 업스트림 429 `console.warn`.
- **WAF 규칙 런북:** the exact `vercel firewall rules add` command from the Operational Rollout appendix below, the staged rollout (log → preview deny → production), per-region counter caveat, and **"publish는 Ori가 실행"**.
- **관측:** Firewall 대시보드(`/firewall/traffic?filter=<ruleId>`), `vc metrics vercel.firewall_action.count`(Observability Plus 필요), Vercel Logs의 429 경고.
- **롤백:** `vercel firewall rules disable` / `--action log`; 지속(duration) 액션은 롤아웃 중 사용하지 않음.
- **알려진 한계:** per-IP 제한은 단일 클라이언트 남용만 막고, 집계 쿼터 상한은 CDN 캐시 + 반올림이 담당한다. 참고 파일 `frontend/entities/asset/api/fetch-remote-manifest.ts`는 동일한 본문-읽기 타임아웃 갭이 남아 있으며 이 이슈 범위 밖(후속 과제)이다.

- [ ] **Step 2: Reference it from the weather skill**

In `docs/skills/weather-domain-contracts.md`, add a short English line under **Hard rules** (or a new "Proxy protection" note) — keep it English:

```markdown
- Proxy routes (`/v1/weather/*`, `/v1/geocode`) enforce fetch timeouts (server 5s, client 8s) mapped to `INVALID_PROVIDER_RESPONSE`, CDN cache headers aligned to staleTime (core 600s, aqi 1800s, geocode 86400s; errors `no-store`), and 2-decimal lat/lon rounding. Rate limiting is a Vercel WAF rule — see `docs/openweather-proxy-protection.md` (the control-plane rule's source of truth).
```

- [ ] **Step 3: Commit**

```bash
git add docs/openweather-proxy-protection.md docs/skills/weather-domain-contracts.md
git commit -m "$(cat <<'EOF'
docs(weather): 프록시 요청 제한/쿼터 보호 운영 문서 추가 및 스킬 참조 연결

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification (before opening the PR)

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest run` (full suite — matches the pre-commit hook; confirms no real-time waits crept in)
- [ ] Confirm no `test-key` / API key leaks in any error body (existing assertions cover this; keep them green).
- [ ] Open the PR from the worktree branch using the project template: link issue #98, state scope (Part A + C) and non-scope (WAF rule is operational, `fetch-remote-manifest.ts` gap deferred), list tests run. No screenshots (no UI change).

## Operational Rollout — Vercel WAF rule (Ori executes; NOT part of the code PR)

Staged, per the firewall skill. **Ori runs `publish`; the assistant only stages and never enables attack-mode / pauses mitigations.**

1. **Preflight (read-only):** `vercel link`, then `vercel firewall overview` to confirm custom-rule/WAF entitlement. If custom rules aren't available on the plan, the code PR's caching + timeouts stand alone and we revisit the rate-limit mechanism.
2. **Stage in log mode:**
   ```bash
   vercel firewall rules add "Rate limit OpenWeather proxy" \
     --condition '{"type":"path","op":"pre","value":"/v1/weather"}' \
     --or --condition '{"type":"path","op":"pre","value":"/v1/geocode"}' \
     --action rate_limit --rate-limit-keys ip \
     --rate-limit-window 60 --rate-limit-requests 100 \
     --rate-limit-action log --yes
   ```
   Start: 60 s window, 100 req/IP (~5–6× a legitimate burst: a location view ≈ 2 calls, a 6-favorite refresh ≈ 12, plus geocode). Counters are per-region.
3. **Ori:** `vercel firewall diff` → `vercel firewall publish --yes`; review `/<team>/<project>/firewall/traffic?filter=<ruleId>` for false positives.
4. **Enforce in preview first** (`--rate-limit-action rate_limit` + an `environment=preview` condition), publish, test a preview URL, then enforce in production.
5. **Rollback:** `vercel firewall rules disable "Rate limit OpenWeather proxy"` or revert to `--action log`.
