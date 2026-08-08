# Issue #78 — 앱 셸 서비스 워커 작업 메모

오프라인 앱 셸 캐싱을 위한 서비스 워커를 도입했다. 원 설계
(`docs/legacy/service-worker-caching-design.md`)의 **부분집합**만 구현했다: 앱 셸 +
정적 에셋 런타임 캐시. 날씨 API 캐시(`cache-http`)·PWA 매니페스트·Periodic
Background Sync는 범위 밖으로 남겼다.

## 핵심 설계 결정

### 1. Workbox 대신 손으로 쓴 서비스 워커

- 캐시 버킷 2개와 전략 2개(cache-first / network-first)뿐이라 Workbox의 빌드
  통합·프리캐시 매니페스트 생성기를 들이는 것은 과했다.
- 파일명이 빌드마다 해시로 바뀌므로 **사전 캐시(precache) 목록을 만들지
  않는다.** 대신 런타임에 실제 요청 URL로 캐시한다. 이 때문에 프리캐시
  매니페스트를 관리해 줄 도구의 주 이점이 사라진다.
- `public/sw.js`는 번들러를 거치지 않고 그대로 정적 서빙되므로 의존성 0, 읽기
  쉬운 단일 파일로 유지했다.

### 2. 전략 매핑

| 리소스                                              | 전략                               |
| --------------------------------------------------- | ---------------------------------- |
| 정적 에셋(`/assets/*` 해시 JS/CSS/폰트)             | 캐시 우선(cache-first)             |
| `*.webp` 스케치(교차 출처 매니페스트 override 포함) | 캐시 우선(cache-first)             |
| 내비게이션(HTML 문서)                               | 네트워크 우선 + 같은 URL 캐시 폴백 |
| 날씨/지오코드/매니페스트 API(`/v1/*`)               | **가로채지 않음(캐시 안 함)**      |

- 캐시 버킷: `weatherpane-app-shell-v1`(내비게이션), `weatherpane-assets-v1`(에셋).
- 내비게이션 전략은 "네트워크 우선 + 캐시 폴백"이다. "offline-first"가 아니다 —
  온라인일 때는 항상 네트워크 최신 HTML을 받아 캐시를 갱신하고, 실패했을 때만
  같은 URL의 캐시된 셸로 폴백한다.
- `/v1/*`를 캐시하지 않는 이유: 영속 스냅샷 저장소가 "보여줘도 되는 날씨
  데이터"의 유일한 판단 주체다. SW가 stale한 날씨 응답을 몰래 돌려주면 스냅샷
  cutoff(Weather 24h / AQI 12h)와 last-updated 정직성 규칙이 이중 진실 공급원으로
  깨진다.
- 안전 가드: `cacheFirst`는 200 또는 opaque 응답만, `networkFirst`는 200 응답만
  캐시에 넣는다(206 등은 `cache.put`이 던지므로 제외). 캐시 쓰기는
  `event.waitUntil(cache.put(...))`로 감싸 응답 반환 후에도 완료를 보장한다.

### 3. `skipWaiting` 호출 안 함(보수적 활성화)

- 새 워커를 즉시 활성화하면 새 HTML을 이전 캐시에 남은 옛 청크와 섞어 내보낼
  위험이 있다. 그래서 새 워커는 대기 상태로 두고, 기존 탭이 모두 사라진 뒤 다음
  내비게이션에서 제어권을 넘겨받게 한다.
- `activate`에서 이 버전 집합(`EXPECTED_CACHES`)에 없는 `weatherpane-*` 캐시를
  정리하고 `clients.claim()`으로 열린 클라이언트를 제어한다.
- 캐시 이름은 버전드다. 전략이나 대상이 바뀌면 `v1 → v2`로 올려 옛 캐시를
  자연스럽게 폐기한다.

### 4. `routeDiscovery: { mode: 'initial' }`

- `react-router.config.ts`에 설정. RR7의 지연 라우트 탐색(`/__manifest` fetch)을
  끄고 전체 라우트 매니페스트를 초기 HTML에 인라인한다.
- 라우트가 소수라 페이로드 비용은 무시할 수준이다.
- 이 앱 전역 변경이 오프라인 셸을 가능하게 한다: 오프라인 셸이 캐시된
  `/__manifest`에 의존하지 않게 되고, 알려진 `/__manifest` 경쟁 상태(기존 e2e
  flakiness 원인 하나)도 사라진다.

### 5. `AppEffects`에서 등록(프로덕션 전용)

- `frontend/app/providers/app-effects.tsx`의 `useEffect`에서
  `registerServiceWorker`(`frontend/shared/pwa/register.ts`)를 호출한다.
- `enabled: import.meta.env.PROD` — dev 서버에는 빌드된 `sw.js`가 없고, 개발 중
  SW 캐시는 오히려 방해가 된다.
- 등록 실패는 조용히 무시한다. SW는 향상(enhancement)일 뿐이며, 없거나 실패해도
  앱은 네트워크 직접 fetch로 정상 동작한다(fail-safe).

### 6. `vercel.json` — `/sw.js` 헤더

- `Cache-Control: public, max-age=0, must-revalidate`를 `/sw.js`에 지정했다.
- 워커 스크립트 자체가 CDN/브라우저에 오래 캐시되면 새 SW 배포가 늦게
  반영되므로, 스크립트는 항상 재검증되게 한다(캐시 대상은 SW가 관리하는 에셋이지
  SW 스크립트가 아니다).

## 두 번 로드 캐싱 특성 (반드시 기억)

- 오프라인 새로고침이 앱 셸을 **신뢰성 있게** 부팅하려면, SW가 한 번의 전체
  로드를 **이미 제어한 뒤**여야 한다. 표준 2회차 방문 PWA 동작이다.
- 이유: SW는 자신이 제어 중인 로드에서만 런타임 캐시를 채운다. **첫 방문에는 아직
  제어권이 없으므로** 그 로드의 리소스는 캐시에 들어가지 않는다.
- 그래서 스모크 테스트도 오프라인 전환 전에 온라인으로 한 번 더 새로고침해
  캐시를 채운다(`tests/service-worker-offline.pwa.e2e.ts`). 이는 우회가 아니라
  실제 사용자 흐름(2회차 방문)과 동일하다.

## 프로덕션 빌드 전용 e2e

- 서비스 워커는 프로덕션 빌드에서만 산출된다(dev 서버·메인 e2e에는 없음). 그래서
  SW 스모크는 별도 설정으로 돌린다.
- `pnpm test:e2e:pwa` → `playwright.pwa.config.ts`. `webServer`가
  `VITE_WEATHER_PROVIDER_MODE=mock pnpm build` 후
  `scripts/serve-production-build.js`로 서빙한다. `testMatch: **/*.pwa.e2e.ts`,
  `workers: 1`(직렬).
- 스모크(`tests/service-worker-offline.pwa.e2e.ts`)는 (1) `/`로 이동해 SW가
  `controller`를 가질 때까지 대기, (2) 온라인으로 한 번 더 reload해 캐시 채움,
  (3) `context.setOffline(true)` 후 reload, (4) `role="alert"` 배너에 "오프라인
  상태"가 뜨는지 확인한다. 브라우저 오프라인 오류 페이지였다면 이 배너가 없다.

## 남은 우려 (전체 브랜치 리뷰에서 다룰 것)

- **CI 공백:** `test:e2e:pwa`가 `.github/workflows/ci.yml`에 연결되어 있지 않다.
  현재 CI는 `pnpm test:e2e`(메인 스모크)만 돈다. 따라서 SW 스모크는 지금 CI 어디에서도
  실행되지 않는다. **결정 대기:** CI에 연결할지(프로덕션 빌드 시간이 추가됨) 아니면
  후속 이슈로 뺄지. 이번 PR 범위에서는 CI 워크플로를 건드리지 않았다.
- **`settings.e2e.ts` flake(선재):** 병렬 부하에서 간헐 실패하는 기존 flake가
  관찰된다. 이번 SW 변경과 무관한 선재 문제로 보이며, 전체 브랜치 리뷰에서
  확인한다.

## 합의된 후속 (별도 이슈)

- **Favorites 오프라인 스냅샷 fallback:** 이번 이슈로 오프라인 새로고침 시 앱
  셸이 부팅되면서 즐겨찾기 카드가 오프라인에서 도달 가능해졌다. 그러나
  `frontend/pages/favorites/ui/favorite-card.tsx`는 세션 내 `useCoreWeather`만
  사용(영속 스냅샷 없음)하므로 오프라인에서 `CardError`를 표시한다. Home/Detail과
  동일하게 24h 영속 날씨 스냅샷 fallback을 주어, 오프라인 즐겨찾기가 stale
  카드로 정직하게 저하되도록 한다. (PR 오픈 후 이슈 생성 예정.)
