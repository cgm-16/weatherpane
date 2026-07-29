# 2026-07-28 프로젝트 상태 점검 및 초기 명세 대비 비교

`origin/main` `c6b34ce` 기준. 초기 명세(`8dd1c2b`)와 현재 명세·구현을 비교하고, 이터레이션을 축별로 평가한 뒤 후속 이슈를 도출한 기록이다.

## 1. 검증된 건강 상태

모두 실제로 실행해서 확인했다.

| 항목             | 명령             | 결과                                  |
| --- | --- | --- |
| Lint             | `pnpm lint`      | 통과 (exit 0)                         |
| Typecheck        | `pnpm typecheck` | 통과 (exit 0)                         |
| Unit/Integration | `pnpm test:unit` | 50개 파일 / 486개 테스트 통과 (6.16s) |
| E2E              | `pnpm test:e2e`  | 34개 통과 (16.5s)                     |
| Build            | `pnpm build`     | 성공                                  |

이슈 트래커: 34개 전부 CLOSED, 열린 이슈 0개.

| 분류      | 개수 | 비고                                   |
| --- | --- | --- |
| `[Task]`  | 23   | WP-001~WP-022 22개 + #3(에이전트 문서) |
| `[Docs]`  | 4    | #1, #5, #11, #71                       |
| 버그/수정 | 4    | #58, #63, #67, #69                     |
| `feat`    | 2    | #25, #60                               |
| `[CI]`    | 1    | #16                                    |

E2E는 34개 전부 통과하지만 dev 서버 로그에 **하이드레이션 불일치 경고**가 남는다. 통과 여부만 보면 놓치는 신호다 (§3.2).

## 2. 초기 명세 대비 현재 명세 비교

### 2.1 명세 문서의 갱신 이력이 비대칭이다

```bash
git rev-list --count 8dd1c2b..origin/main -- docs/specs.md            # 7
git rev-list --count 8dd1c2b..origin/main -- docs/specs-favorites.md  # 0
```

- `docs/specs.md`는 구현을 따라가며 7회 개정됐다. IndexedDB → versioned Web Storage 정정, `RawGpsFallbackLocation` / `CurrentLocationResult` 계약 추가, 저장 키 스키마 표 갱신, 스냅샷 예시 정정.
- `docs/specs-favorites.md`는 **최초 커밋 이후 한 번도 갱신되지 않았다.** 여전히 IndexedDB object store, `GET/POST/PATCH/DELETE /v1/favorites`, ETag + If-Match 낙관적 동시성, SyncQueue를 명세한다. 이 중 구현된 것은 없다.

### 2.2 역방향 드리프트가 더 심각하다

실질적 제품 규칙이 명세 문서가 아니라 구현 단계에서 생성된 문서들에 쌓였다.

| 규칙                                        | `AGENTS.md` | `docs/skills/favorites-behavior.md` | `docs/tasks/T16-*.md` | `docs/legacy/*`     | 초기 명세 |
| --- | --- | --- | --- | --- | --- |
| Favorites max is 6                          | L54         | L19                                 | L22                   | prompt.md L144      | 없음      |
| Undo restores exact previous favorite state | L58         | L25                                 | L31                   | issues.md L384 인근 | 없음      |
| Only the latest removal is undoable         | L59         | L26                                 | L29                   | issues.md L384      | 없음      |
| Undo timeout 5s | **없음** | L26 | L30 | prompt.md L987 | 없음 |

```bash
git show 8dd1c2b:docs/specs.md | grep -niE "undo|되돌리|6개"   # 0건
grep -niE "max is 6|Undo restores|latest removal" docs/skills/favorites-behavior.md
```

FAV-01~FAV-12, UX-01~UX-11 확정 결정 로그에 이 규칙들이 역기록되지 않았다. 명세 문서만 읽는 사람은 존재를 알 수 없다. `Undo timeout 5s`는 `AGENTS.md`에도 없어 skill·task·legacy 문서에만 있다.

이슈 #75가 명세에 역기록해야 할 규칙은 위 4개다. 반면 `Favorites order is manual and persisted`는 **초기 명세에 이미 있다** — UX-06(드래그 핸들 + 위/아래 버튼), UX-07(편집/정렬 모드 한정 노출), `order: int` 정의(L76), `favorites` store의 `order` 인덱스(L110).

### 2.3 명시적 수치 모순

| 항목                     | `docs/specs.md`            | `AGENTS.md`             | 구현                    |
| --- | --- | --- | --- |
| Weather 스냅샷 cutoff    | Summary 24h                | 24h                     | 24h                     |
| Detail/AQI 스냅샷 cutoff | **Detail 48h**             | **AQI 12h**             | AQI 12h                 |
| staleTime                | Summary 10분 / Detail 30분 | Weather 10분 / AQI 30분 | Weather 10분 / AQI 30분 |

명세는 Summary/Detail 축으로, 구현은 Weather/AQI 축으로 나뉘었다. 두 문서가 모두 "현재"를 주장하면서 다른 숫자를 말한다.

*(이 절은 문서 대조 결과만 있고 재현 명령이 없다. §5.2 참조.)*

### 2.4 라우트 목록 불일치

- 명세: `/`, `/search`, `/location/:locationId`, `/settings`
- 실제: `/`, `/search`, `/favorites`, `/location/:resolvedLocationId`

`/settings`는 끝내 만들어지지 않았고, `/favorites`는 명세 라우트 목록에 없는 채로 출시됐다.

*(이 절도 재현 명령 없음.)*

### 2.5 미구현으로 남은 초기 명세 범위

| 명세 우선순위 | 항목                                          | 상태                                                              |
| --- | --- | --- |
| P0            | Home / Search / Favorites                     | 완료                                                              |
| P0 | Weather Detail | **부분 구현** — 일별 예보 누락 (§2.5.1) |
| P1            | Settings (테마·단위·로컬 데이터 초기화)       | **미구현** — 라우트·`unitTemp`·`reduceMotion`·캐시 삭제 전부 없음 |
| P1 | Service Worker (앱 셸 precache + 런타임 캐시) | **미구현** — SW/Workbox 참조 0건 |
| P2            | 원격 스케치 매니페스트                        | 완료                                                              |
| P2            | 고급 오프라인 동기화                          | 미구현 (의도된 범위 밖)                                           |
| —             | Favorites 서버 동기화 (REST/ETag/SyncQueue)   | 미구현 — 로컬 저장소 MVP로 축소                                   |

Favorites 서버 동기화와 SW는 의도적 범위 축소로 볼 수 있으나, 명세 문서가 그렇게 표기하지 않는다는 점이 문제다.

> **이 표의 우선순위와 §6 이슈 표의 우선순위는 다른 축이다.** 위 열은 `docs/specs.md`가 부여한 **명세 우선순위**이고, §6은 이번 점검의 **작업 트리아지**다. 어긋나는 항목은 하나뿐이다.
>
> **Service Worker: 명세 P1 → 트리아지 P2 (#78).** 명세가 SW를 P1로 둔 이유는 오프라인 대응인데, 그 핵심(스냅샷 fallback, 오프라인 배너, 온라인 복귀 시 재조회)은 이미 구현돼 있다. SW가 추가로 주는 것은 앱 셸 precache이고, API 키 노출(#73)이나 P0 미충족(#87)보다 뒤다. Settings는 양쪽 다 P1(#77)이다.

### 2.5.1 Weather Detail의 일별 예보가 미구현이다

`docs/specs.md`는 Detail을 두 곳에서 정의하며 둘 다 일별을 요구한다.

- L19: "선택 위치의 상세 예보(**시간별/일별**)와 보조 지표"
- L32: P0 행 — "최소한 '현재/**시간별/일별**' 표시 + 오류/스켈레톤"

```bash
grep -nE "daily|hourly" frontend/entities/weather/model/core-weather.ts
# 50:  hourly: CoreWeatherHourlyEntry[];      ← daily 없음

grep -n "daily" frontend/entities/weather/api/openweather.ts
# 400:  minC: payload.daily[0].temp.min,
# 401:  maxC: payload.daily[0].temp.max,
```

어댑터는 `payload.daily[0]`에서 **오늘의 최저/최고만** 뽑고 나머지 일별 배열을 버린다. `CoreWeather`에 `daily` 필드가 없고, `DetailDashboard`는 `HourlyStrip`(12시간)만 렌더링한다. 명세의 `WeatherDetailSnapshot`이 `daily: Array<{ date, minC, maxC, conditionCode }>`를 정의하므로 데이터 계약 수준에서도 미충족이다.

데이터는 이미 공급자 응답에 들어와 버려지는 중이라 추가 API 호출 없이 구현 가능하다 (#87).

## 3. 점검 중 새로 발견한 결함

기존 회고(`docs/weatherpane-retrospective.md`, PR #72로 병합됨)에 없는 항목들이다.

### 3.1 [P0] real 모드 OpenWeather API 키가 클라이언트 번들에 노출된다

`frontend/shared/api/real-weather-provider.ts:44`가 `import.meta.env.VITE_OPENWEATHER_API_KEY`를 읽는다. `VITE_` 접두사 변수는 빌드 시 정적으로 인라인된다. SSR 앱이므로 클라이언트 그래프 도달 여부를 센티널 값으로 검증했다.

```bash
VITE_WEATHER_PROVIDER_MODE=real VITE_OPENWEATHER_API_KEY=SENTINEL_KEY_XYZ123 pnpm build
grep -rl "SENTINEL_KEY_XYZ123" build/client
# → build/client/assets/app-providers-BdxTaDDJ.js
```

키가 클라이언트 JS에 그대로 들어간다. 배포된 번들을 내려받는 누구나 추출할 수 있다. 초기 명세가 "클라이언트 직접 서드파티 호출(권장하지 않음: 키 노출/쿼터)"이라고 경고했던 바로 그 상황이다. `real` 모드 프로덕션 배포의 차단 요인.

### 3.2 [P1] Node 24 SSR에서 오프라인 배너가 항상 렌더링된다

`frontend/shared/hooks/use-online-status.ts`의 초기 상태:

```ts
useState(() => typeof navigator === 'undefined' || navigator.onLine);
```

Node 21+ 부터 `globalThis.navigator`가 존재하지만 `onLine` 속성은 없다. `.nvmrc`는 24, 실행 환경은 v24.15.0.

```bash
node -e "console.log(typeof navigator, navigator.onLine, typeof navigator === 'undefined' || navigator.onLine)"
# → object undefined undefined
```

`typeof navigator === 'undefined'`가 false이고 `navigator.onLine`이 `undefined`이므로 SSR에서 `isOnline`이 falsy가 된다. `OfflineBanner`는 `frontend/shared/ui/app-shell.tsx:17`에 있고 `AppShell`이 셸 레이아웃 전체를 감싸므로 전 라우트가 영향받는다.

```bash
set -euo pipefail
VITE_WEATHER_PROVIDER_MODE=mock pnpm build >/dev/null

VITE_WEATHER_PROVIDER_MODE=mock PORT=3112 pnpm exec react-router-serve \
  ./build/server/nodejs_eyJydW50aW1lIjoibm9kZWpzIn0/index.js >/tmp/wp-routes.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT

for i in $(seq 1 20); do
  curl -fsS -o /dev/null "http://127.0.0.1:3112/" && break
  sleep 1
done

for p in "/" "/search" "/favorites" "/location/loc_seoul-jongno"; do
  n=$(curl -fsS "http://127.0.0.1:3112$p" | grep -c 'role="alert"')
  echo "$p → $n"
done
```

```text
/                            → 1
/search                      → 1
/favorites                   → 1
/location/loc_seoul-jongno   → 1
```

온라인 상태의 프로덕션 서버가 렌더링한 4개 라우트 전부에 오프라인 배너가 들어 있다. dev 전용 현상이 아니다.

React가 클라이언트에서 복구하므로 E2E 34개는 전부 통과하지만, 실사용자는 첫 페인트에서 "오프라인 상태" 배너가 번쩍이는 것을 본다. 유닛 테스트는 jsdom(`navigator.onLine === true`)이라 잡지 못한다.

> 위 명령은 `set -euo pipefail`, `curl -fsS`, `$!` 추적, `trap` 정리, 기동 대기 루프를 포함한다. 서버가 죽으면 grep 단계에 도달하지 않는다 — 이 안전장치가 없어 실제로 오판할 뻔했다 (§3.2.1).

### 3.2.1 [P1] `pnpm start` / `pnpm preview`가 깨져 있다

`package.json`이 `./build/server/index.js`를 가리키지만 실제 산출물은 `build/server/nodejs_eyJydW50aW1lIjoibm9kZWpzIn0/index.js`에 있다. 커밋 `2528de9`가 Vercel preset을 도입하며 출력 경로가 바뀐 뒤 스크립트가 갱신되지 않았다.

```text
Error: Cannot find module '/Users/ori/repos/weatherpane/build/server/index.js'
```

§3.2 검증 첫 시도에서 서버가 조용히 죽고 `curl`이 HTTP 000을 반환해, 하마터면 "프로덕션에서는 재현되지 않는다"는 결론을 낼 뻔했다. 프로덕션 빌드를 띄워보는 경로가 막혀 있다는 사실 자체가 별도 결함이다 (#84).

*(이 절은 오류 출력만 있고 실행 명령이 기록돼 있지 않다. §5.2 참조.)*

### 3.3 [P2] 루트 `node_modules`가 git worktree 내부를 심볼릭 링크로 참조한다

```bash
readlink node_modules/react-dom
# → ../.worktrees/fix-korean-ime/node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom
```

루트 저장소의 pnpm 가상 스토어가 `.worktrees/fix-korean-ime/` 안에 있다. 해당 worktree를 제거하면 루트 저장소의 의존성이 깨진다. E2E 스택 트레이스가 worktree 경로를 출력하는 것도 이 때문이다.

### 3.4 [P2] 죽은 컴포넌트 3개

```bash
grep -rn "PlaceholderPage\|HomeNotFound\|HomeUnsupported" app frontend tests stories \
  --include="*.ts" --include="*.tsx" | grep -v "export function"
# → placeholder-page.tsx 자신의 타입 선언 3줄만 매치. 나머지 둘은 출력 없음.
```

| 파일 | 담고 있는 영문 문구 |
| --- | --- |
| `frontend/shared/ui/placeholder-page.tsx` | South Korea weather app / Location placeholder 등 |
| `frontend/pages/home/ui/home-not-found.tsx` | Lost in the Mist / Take me Home / Check Forecast |
| `frontend/pages/home/ui/home-unsupported.tsx` | Feature Unavailable / Return Home / Search Locations |

`placeholder-page.tsx`는 T01 스캐폴딩 잔재다. raw Tailwind 색상과 폐기된 라우트 규약(`/location/seoul-jongno`, 현재는 `loc_` 접두사)도 담고 있다.

나머지 둘은 성격이 다를 수 있다. `useDetailBootstrap`의 상태 union에 `not-found`와 `unsupported`가 있으므로, **의도적 미연결인지 누락인지 판단이 필요하다** (#82).

### 3.5 [P2] 살아 있는 UI의 언어·토큰 규칙 위반

grep 히트가 아니라 호출 지점과 prop 전달을 확인해 분류했다.

```bash
# 1) 컴포넌트별 호출 지점
grep -rn "\bHomeConfigError\b" app frontend --include="*.tsx" | grep -v "export function"

# 2) 호출 지점이 실제로 넘기는 prop (선택적 prop은 가드 뒤에 숨는다)
sed -n '40,50p' frontend/app/providers/app-providers.tsx
sed -n '15,45p' frontend/pages/home/ui/home-page.tsx
```

#### A. 도달 가능한 영문 문구 (7곳)

| 위치                           | 문구                                                   |
| --- | --- |
| `home-config-error.tsx:25`     | Settings Update Needed                                 |
| `home-config-error.tsx:28`     | Your travel concierge needs a quick adjustment… (본문) |
| `home-connection-error.tsx:41` | Connection Interrupted                                 |
| `home-connection-error.tsx:44` | We're having trouble reaching the horizon… (본문)      |
| `home-connection-error.tsx:54` | Retry Connection                                       |
| `home-connection-error.tsx:71` | Error Code: CONNECTION_FAILED                          |
| `search-page.tsx:306`          | Korea catalog search                                   |

`HomeConfigError` ← `app-providers.tsx:45`(프로덕션 설정 오류 오버레이), `home-page.tsx:19`. `HomeConnectionError` ← `home-page.tsx:37`.

#### B. 도달 불가 — 선택적 prop 가드 뒤 (3곳)

| 위치                           | 문구               | 가드                                                               |
| --- | --- | --- |
| `home-config-error.tsx:52`     | Open Settings      | `{onOpenSettings && …}` — 두 호출 지점 모두 `error`만 전달         |
| `home-config-error.tsx:61` | Try Again | `{onRetry && …}` |
| `home-connection-error.tsx:63` | Go to Saved Places | `{onGoToSavedPlaces && …}` — `home-page.tsx:37`은 `onRetry`만 전달 |

`home-connection-error.tsx:5`에 의도가 주석으로 있다: "WP-017 즐겨찾기 구현 전까지는 전달하지 않으면 버튼을 숨깁니다." 번역해도 화면에 나오지 않으므로 연결할지 제거할지 판단이 먼저다.

#### C. raw Tailwind 색상 — 살아 있는 4개 파일

```bash
grep -rnoE "\b(text|bg|border)-(slate|sky|zinc|gray|neutral|stone|white|black)(\/[0-9]+)?(-[0-9]{2,3}(\/[0-9]+)?)?" \
  app frontend --include="*.tsx" | grep -v placeholder-page
```

| 파일                                     | 값                                                                                                      | 렌더 경로                                  |
| --- | --- | --- |
| `app/root.tsx` (ErrorBoundary, L103~109) | `text-sky-300`, `text-white`, `text-slate-300`, `text-slate-200`, `border-slate-800`, `bg-slate-950/80` | L82 export, 전역 오류 경계 |
| `home-config-error.tsx:12`               | `bg-white/50`                                                                                           | `app-providers.tsx:45`, `home-page.tsx:19` |
| `detail-aqi-card.tsx`                    | `bg-black/40`                                                                                           | `detail-dashboard.tsx:152`                 |
| `detail-uv-card.tsx`                     | `bg-black/40`                                                                                           | `detail-dashboard.tsx:153`                 |

`detail-*-card` 2개는 오류 화면이 아니라 **정상 상세 화면에서 매일 렌더링된다.** `frontend/app/styles/tokens.css`의 Haet-Ssal / Dal-Bit Night 체계를 우회하므로 다크 모드 대비가 보장되지 않는다.

사용자 대면 부채는 영문 문구 7곳 + raw 색상 4개 파일이다 (#88).

## 4. 프로세스 관찰

### 4.1 stale 브랜치 36개 — 전부 정리 대상

`origin/main` 기준으로 센다.

```bash
git fetch origin --prune
git branch --no-merged origin/main | wc -l                                  # 37
git branch --no-merged origin/main | grep -vc "docs/85-docs-status-review"  # 36
```

37개 중 1개는 이 PR의 작업 브랜치이므로 정리 대상은 36개다. 전부 squash merge 잔재로 보인다 — 예: `fix/63-hangul-ime`의 수정은 `f7dc7e2`에 동일 메시지로 존재한다.

**다만 36개를 전수 대조하지는 않았다.** 표본 3개(`feat/wp-012-home-dashboard`, `fix/63-hangul-ime`, `feat/25-design-tokens`)만 확인했으므로 "전부"는 추정이다. 삭제 전 개별 확인이 필요하다 (#83).

확인된 범위에서 작업 유실은 없고 알려진 미병합 브랜치는 0개다. 회고 문서도 PR #72로 2026-06-01에 병합됐다.

이 목록이 무의미해진 상태 자체가 비용이다. 진짜 미병합 브랜치가 생겨도 노이즈에 묻힌다 — 실제로 이번 점검에서 병합된 브랜치를 미병합으로 오독했다.

## 5. 이터레이션 평가

단일 점수는 반증 불가능하므로 축별로 나눈다.

| 축              | 점수   | 근거                                                                                                                                                                                                                            |
| --- | --- | --- |
| 스펙 커버리지 | 6/10 | P0 3.5/4 — Detail 일별 예보 미구현(#87). P1 2개(Settings, SW) 미착수. P2 1/2. |
| 엔지니어링 품질 | 7.5/10 | lint·typecheck 무결, 486 유닛 + 34 E2E 통과, FSD 경계 준수, bootstrap 상태를 discriminated union으로 모델링. 감점: SSR 하이드레이션 결함이 전 테스트 계층 통과, 8.3MB 청크가 상세 라우트까지 로드, 죽은 코드 3개. |
| 문서 정합성 | 5/10 | 가장 약한 축. `specs-favorites.md` 무갱신, cutoff 수치 모순, 제품 규칙 역기록 누락, 살아 있는 UI의 한국어 규칙 위반 7곳. |
| 프로덕션 준비도 | 4/10 | API 키 노출이 `real` 모드를 차단. 번들 예산 기준·CI 게이트 부재, SW 없음, 모니터링·쿼터 대응 없음. `mock` 모드 데모로는 완성. |
| 프로세스 규율 | 8/10 | 22개 태스크를 이슈→브랜치→PR로 일관 수행, 커밋 메시지 규약 준수, 종료 이슈 산출물도 전부 병합됨. 감점: 브랜치 정리 부재. |

**종합: 6/10 — 잘 만들어진 MVP이나 프로덕션 준비 상태는 아니다.**

강점은 명확하다. 상태 경계 설계(Query 캐시 ≠ 영속 스냅샷), unsupported 위치의 active location 보호, 한국어 IME/URL 상태 분리는 이 규모 앱에서 흔히 놓치는 부분을 제대로 짚었다. 테스트가 제품 규칙을 문서화하는 수준까지 갔다.

약점은 문서와 운영이다. 코드는 스스로를 설명하지만 명세 문서는 이제 코드보다 초기 구상에 가깝다. 그리고 `real` 모드는 지금 배포하면 안 된다.

### 5.1 테스트가 초록인데 결함이 나온 이유

**모든 테스트 계층이 통과하는 상태에서, 빌드 산출물이나 실행 중인 프로덕션 서버를 직접 봐야만 보이는 결함이 4건 나왔다.**

| 결함                         | 발견 수단                           |
| --- | --- |
| API 키 클라이언트 노출 (#73) | 센티널 빌드 후 `build/client` grep  |
| SSR 오프라인 배너 (#74)      | 프로덕션 서버 기동 후 HTML 검사     |
| 8.3MB 카탈로그 청크 (#80)    | 번들 크기 실측 + import 그래프 확인 |
| 깨진 `pnpm start` (#84)      | 프로덕션 번들 기동 시도             |

lint·typecheck·486 유닛·34 E2E 어느 것도 이 중 하나를 잡지 못했다. 현재 검증 체계에는 "테스트가 통과하는가"는 있지만 **"배포되는 것이 무엇인가"를 확인하는 단계가 없다.** 개별 수정보다 아래 세 가지를 CI에 넣는 것이 우선순위가 높다.

- 번들 예산 검사 (#80 재발 방지)
- 프로덕션 번들 기동 스모크 (#84 재발 방지, #74 같은 SSR 결함의 검증 경로 확보)
- 하이드레이션 경고를 E2E 실패로 처리 (#74 재발 방지)

`pnpm build`가 성공한다는 것과 빌드된 것이 동작한다는 것은 다른 명제다.

### 5.2 이 문서의 신뢰 수준

이 문서는 PR #86 리뷰에서 사실 주장 17건이 정정됐다. 전부 리뷰로 걸러졌고 자체 발견은 0건이다. 실패 원인은 셋으로 나뉜다.

| 원인 | 예 |
| --- | --- |
| 검증 범위를 좁혀놓고 전체 결론을 냄 | `git fetch` 없이 로컬 `main`만 보고 "회고 미병합" 단정 |
| 국소 수정 후 전체 미재검토 | 표에 행을 추가하고 그 수를 참조하는 문장을 안 고침 |
| grep 결과를 사실로 취급 | 렌더 경로 확인 없이 grep 히트를 "살아 있는 UI"로 분류 |

셋의 공통점은 **한 번의 값싼 조회 결과를 검증된 사실처럼 기록했다는 것**이다. 특히 마지막 항목은 실행 가능한 이슈(#88)를 잘못된 형태로 만들어냈다 — 렌더링되지 않는 버튼 문구 9곳이 "사용자 대면 부채"로 올라가 있었다.

절별 증거 수준은 아래와 같다.

| 절                 | 증거                                                      |
| --- | --- |
| §2.1, §2.2, §2.5.1 | 명령 + 출력 있음                                          |
| §3.1, §3.2, §3.3, §3.4, §3.5 | 명령 + 출력 있음 |
| §4.1 | 명령 + 출력 있음 (단 "전부 잔재"는 표본 3개 기반 추정) |
| §6 (#80 번들 실측) | 명령 + 출력 있음 |
| §3.2.1 | **오류 출력만 있고 실행 명령 없음** |
| §2.3, §2.4 | **문서 대조 결과만 있고 재현 명령 없음** |

§3.2.1, §2.3, §2.4의 주장과 §4.1의 "전부"를 근거로 작업하기 전에는 직접 확인하는 편이 낫다.

교훈은 §5.1과 같은 모양이다. 테스트가 초록인 것과 배포물이 올바른 것이 다르듯, 문서에 근거가 적혀 있는 것과 그 근거가 맞는 것도 다르다.

## 6. 도출한 후속 이슈

회고 §8의 6개 항목을 뼈대로 HEAD 대비 재검증하고 누락분을 추가했다. 회고가 다루지 않은 것: Settings 화면 부재, API 키 노출(회고는 "운영 수준으로 끌어올린다"로 완화), SSR 하이드레이션 결함, `node_modules` 심볼릭 링크, 일별 예보 미구현.

| #       | 우선순위 | 제목                                                                              |
| --- | --- | --- |
| #73     | P0       | real 모드 OpenWeather API 키가 클라이언트 번들에 노출됨                           |
| #74     | P1       | Node 24에서 `navigator.onLine`이 undefined여서 서버가 항상 오프라인 배너를 렌더링 |
| #75     | P1       | 명세 문서와 구현 사이의 드리프트 해소                                             |
| #77     | P1       | `/settings` 화면 구현                                                             |
| #80     | P1       | 카탈로그 청크가 클라이언트 번들 8.3MB(gzip 847KB)를 차지                          |
| #84     | P1       | `pnpm start`·`preview`가 잘못된 서버 번들 경로를 가리켜 실행 불가                 |
| #87 | P1 | Detail 화면 일별 예보 미구현 — P0 명세 미충족 |
| #78     | P2       | Service Worker 기반 앱 셸·에셋 캐시 도입                                          |
| #79     | P2       | 루트 `node_modules`가 `.worktrees/fix-korean-ime` 가상 스토어를 참조              |
| #81     | P2       | `useFavorites`의 단일 인스턴스 가정 제거                                          |
| #88     | P2       | 살아 있는 영문 문구 7곳·raw 색상 4개 파일 한국어/토큰 규칙 적용                   |
| #82 | P3 | 죽은 컴포넌트 3개 정리 (`home-not-found`·`home-unsupported`는 연결 여부 판단 필요) |
| #83 | P3 | squash merge 완료된 stale 브랜치 36개 정리 |

### 카탈로그 번들 비용(#80)을 P1로 둔 근거

회고는 "성능 예산이 빡빡해지면 검토"로 유예했으나 실측 결과 유예할 수준이 아니다.

```bash
ls -lhS build/client/assets/*.js | head -2
# 8.3M  unsupported-route-context-repository-57wGnOZK.js
# 182K  entry.client-DgHsRUOR.js

gzip -c build/client/assets/unsupported-route-context-repository-57wGnOZK.js | wc -c
# 847465

grep -l "unsupported-route-context-repository-57wGnOZK" build/client/assets/*.js
# manifest-051072ec.js / location-CsHXZcMn.js / search-xjLNsgB_.js
```

두 번째로 큰 청크의 46배이고, 검색뿐 아니라 **상세 라우트(`location-*.js`)에서도 정적 import된다.** 북마크로 상세 페이지만 열어도 847KB gzip / 8.3MB 파싱 비용을 치른다.

### 실행 순서 제약

- **#79 → #83.** `node_modules`가 worktree를 참조하므로, 순서를 어기면 루트 저장소 의존성이 깨진다.
- **#74 → #78.** 오프라인 판정이 틀린 상태로 Service Worker를 얹으면 원인 분리가 어렵다.
