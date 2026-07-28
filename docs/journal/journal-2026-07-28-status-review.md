# 2026-07-28 프로젝트 상태 점검 및 초기 명세 대비 비교

`origin/main` `c6b34ce` 기준. 초기 명세와 현재 명세를 비교하고, 현재 이터레이션을 평가한 뒤 후속 이슈를 도출한 기록이다.

> **기준 커밋 정정 (PR #86 리뷰 반영).** 최초 작성은 `git fetch` 없이 **로컬** `main`(`f639123`)을 기준으로 삼았다. 실제 `origin/main`은 `c6b34ce`로 2개 커밋 앞서 있었고, 그 2개가 바로 회고 문서 병합분(PR #72, 2026-06-01)이었다. 이 때문에 §4.1의 "회고 미병합" 결론이 통째로 틀렸다. 아래 §4.1에 정정을 남겼고, 브랜치를 `origin/main`에 리베이스해 기준을 실제와 맞췄다.
>
> 두 커밋은 문서 전용(`docs/weatherpane-retrospective.md`, `docs/journal/journal-2026-06-01-retrospective.md`)이므로 §3의 런타임 결함 4건과 §2의 명세 비교는 영향받지 않는다. 영향 범위는 §4(프로세스 관찰)와 그에 연동된 평가·이슈다.

## 1. 검증된 건강 상태

모두 실제로 실행해서 확인했다.

| 항목             | 명령             | 결과                                  |
| ---------------- | ---------------- | ------------------------------------- |
| Lint             | `pnpm lint`      | 통과 (exit 0)                         |
| Typecheck        | `pnpm typecheck` | 통과 (exit 0)                         |
| Unit/Integration | `pnpm test:unit` | 50개 파일 / 486개 테스트 통과 (6.16s) |
| E2E              | `pnpm test:e2e`  | 34개 통과 (16.5s)                     |
| Build            | `pnpm build`     | 성공                                  |

이슈 트래커: 34개 전부 CLOSED, 열린 이슈 0개.

| 분류      | 개수 | 비고                                   |
| --------- | ---- | -------------------------------------- |
| `[Task]`  | 23   | WP-001~WP-022 22개 + #3(에이전트 문서) |
| `[Docs]`  | 4    | #1, #5, #11, #71                       |
| 버그/수정 | 4    | #58, #63, #67, #69                     |
| `feat`    | 2    | #25, #60                               |
| `[CI]`    | 1    | #16                                    |

> **정정 (PR #86 4차 리뷰).** 최초 기록은 "태스크 22개 + 버그 6개 + 문서 6개"였다. 세 숫자 모두 틀렸다. 실제 제목 접두사로 집계한 결과가 위 표다. `[Task]`는 22개가 아니라 23개이고(#3은 WP 번호가 없는 태스크), 버그는 6개가 아니라 4개, `[Docs]` 제목은 6개가 아니라 4개다. 다만 #3은 제목이 `[Task]`이나 내용은 문서 작업이므로, 주제 기준으로 세면 문서 5개로도 볼 수 있다.

단, E2E는 34개 전부 통과했지만 dev 서버 로그에 **하이드레이션 불일치 경고**가 남았다. 통과 여부만 보면 놓치는 신호다 (아래 3.2).

## 2. 초기 명세 대비 현재 명세 비교

### 2.1 명세 문서의 갱신 이력이 비대칭이다

```bash
git rev-list --count 8dd1c2b..origin/main -- docs/specs.md            # 7
git rev-list --count 8dd1c2b..origin/main -- docs/specs-favorites.md  # 0
```

- `docs/specs.md`는 구현을 따라가며 **7회** 개정됐다. IndexedDB → versioned Web Storage 정정, `RawGpsFallbackLocation` / `CurrentLocationResult` 계약 추가, 저장 키 스키마 표 갱신, 스냅샷 예시 정정.
- `docs/specs-favorites.md`는 **최초 커밋 이후 한 번도 갱신되지 않았다.** 여전히 IndexedDB object store, `GET/POST/PATCH/DELETE /v1/favorites`, ETag + If-Match 낙관적 동시성, SyncQueue를 명세하고 있다. 이 중 구현된 것은 없다.

### 2.2 역방향 드리프트가 더 심각하다

실질적 제품 규칙이 명세 문서가 아니라 **에이전트용 운영 문서**에 쌓였다. 확인:

```bash
git show 8dd1c2b:docs/specs-favorites.md | grep -niE "undo|최대|6개"  # 무관한 1건만
git show 8dd1c2b:docs/specs.md | grep -niE "undo|되돌리|6개"          # 0건
grep -niE "max is 6|Undo restores|latest removal" docs/skills/favorites-behavior.md
# 19: Favorites max is 6; adding beyond 6 is blocked ...
# 25: Undo restores the exact previous favorites state ...
# 26: Only the latest removal is undoable; undo clears ...
```

아래 규칙들은 **초기 명세(`docs/specs.md`, `docs/specs-favorites.md`)에 없고**, 구현 단계에서 생성된 문서들에만 존재한다.

| 규칙                                        | `AGENTS.md` | `docs/skills/favorites-behavior.md` | `docs/tasks/T16-*.md` | `docs/legacy/*`     | 초기 명세 |
| ------------------------------------------- | ----------- | ----------------------------------- | --------------------- | ------------------- | --------- |
| Favorites max is 6                          | L54         | L19                                 | L22                   | prompt.md L144      | 없음      |
| Undo restores exact previous favorite state | L58         | L25                                 | L31                   | issues.md L384 인근 | 없음      |
| Only the latest removal is undoable         | L59         | L26                                 | L29                   | issues.md L384      | 없음      |
| Undo timeout 5s                             | 없음        | L26                                 | L30                   | prompt.md L987      | 없음      |

`AGENTS.md`가 "undo timeout 5s"를 담고 있지 않다는 점도 드러난다. 이 규칙은 skill·task·legacy 문서에는 있으나 `AGENTS.md`에만 빠져 있다.

FAV-01~FAV-12, UX-01~UX-11 확정 결정 로그에 이 규칙들이 역기록되지 않았다. 명세 문서를 읽는 사람은 이 규칙의 존재를 알 수 없다.

> **정정 (PR #86 리뷰 반영).** 최초 작성 시 두 가지를 틀렸다.
>
> 1. 출처를 `AGENTS.md`로만 단정했다가 `docs/skills/favorites-behavior.md`를 추가했으나, 2차 리뷰에서 `docs/tasks/T16-favorites-core-actions-and-undo-behavior.md`와 `docs/legacy/*`에도 있음을 지적받았다. 두 번 연속 출처 조사가 불완전했다. 원인은 같다 — 검색 범위를 미리 좁혀놓고 시작했다.
> 2. `Favorites order is manual and persisted`를 목록에 넣었으나 이는 **초기 명세에 이미 있다.** `docs/specs-favorites.md`의 UX-06(드래그 핸들 + 위/아래 버튼), UX-07(편집/정렬 모드에서만 노출), `order: int` 필드 정의(L76), `favorites` store의 `order` 인덱스(L110)가 수동 정렬과 영속을 모두 확정한다. 최초 grep이 `undo|최대|6개`만 검색해 정렬 관련 표현을 놓쳤다. 목록에서 제거했다.
>
> 정리하면 이슈 #75가 명세에 역기록해야 할 규칙은 **4개**다. 최초 목록의 4개 중 `Favorites order is manual and persisted`를 빼고(이미 명세에 있음), 조사 중 새로 찾은 `Undo timeout 5s`를 더한 결과다. 개수가 같아 보이지만 구성이 다르다.

### 2.3 명시적 수치 모순

| 항목                     | `docs/specs.md`            | `AGENTS.md`             | 구현                    |
| ------------------------ | -------------------------- | ----------------------- | ----------------------- |
| Weather 스냅샷 cutoff    | Summary 24h                | 24h                     | 24h                     |
| Detail/AQI 스냅샷 cutoff | **Detail 48h**             | **AQI 12h**             | AQI 12h                 |
| staleTime                | Summary 10분 / Detail 30분 | Weather 10분 / AQI 30분 | Weather 10분 / AQI 30분 |

명세는 Summary/Detail 축으로, 구현은 Weather/AQI 축으로 나뉘었다. 두 문서가 모두 "현재"를 주장하면서 서로 다른 숫자를 말한다.

### 2.4 라우트 목록 불일치

- 명세: `/`, `/search`, `/location/:locationId`, `/settings`
- 실제: `/`, `/search`, `/favorites`, `/location/:resolvedLocationId`

`/settings`는 끝내 만들어지지 않았고, `/favorites`는 명세 라우트 목록에 없는 채로 출시됐다.

### 2.5 미구현으로 남은 초기 명세 범위

| 명세 우선순위 | 항목                                          | 상태                                                              |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| P0            | Home / Search / Favorites                     | 완료                                                              |
| P0            | Weather Detail                                | **부분 구현** — 일별 예보 누락 (아래 참조)                        |
| P1            | Settings (테마·단위·로컬 데이터 초기화)       | **미구현** — 라우트·`unitTemp`·`reduceMotion`·캐시 삭제 전부 없음 |
| P1            | Service Worker (앱 셸 precache + 런타임 캐시) | **미구현** — 코드베이스에 SW/Workbox 참조 0건                     |
| P2            | 원격 스케치 매니페스트                        | 완료                                                              |
| P2            | 고급 오프라인 동기화                          | 미구현 (의도된 범위 밖)                                           |
| —             | Favorites 서버 동기화 (REST/ETag/SyncQueue)   | 미구현 — 로컬 저장소 MVP로 축소                                   |

Favorites 서버 동기화와 SW는 의도적 범위 축소로 볼 수 있으나, 명세 문서가 그렇게 표기하지 않고 있다는 점이 문제다.

> **주의 — 이 표의 우선순위와 §6 이슈 표의 우선순위는 다른 축이다.** 위 열은 `docs/specs.md`가 부여한 **명세 우선순위**이고, §6은 이번 점검의 **작업 트리아지 우선순위**다. 둘이 어긋나는 항목은 하나뿐이며 의도적이다.
>
> - **Service Worker: 명세 P1 → 트리아지 P2 (#78).** 명세가 SW를 P1로 둔 이유는 오프라인 대응이었는데, 그 목적의 핵심(스냅샷 fallback, 오프라인 배너, 온라인 복귀 시 재조회)은 이미 구현돼 있다. SW가 추가로 주는 것은 앱 셸 precache이고, 이는 "오프라인에서 새로고침 시 앱이 뜨는가"의 문제다. 중요하지만 API 키 노출(#73)이나 P0 미충족(#87)보다 뒤다.
>
> 나머지 항목은 두 축이 일치한다. Settings는 명세 P1 / 트리아지 P1(#77)이다.

### 2.5.1 [정정] Weather Detail의 일별 예보가 미구현이다

최초 작성 시 P0 4개를 모두 완료로 표기했으나 틀렸다. PR #86 리뷰에서 지적받아 확인했다.

`docs/specs.md`는 Detail을 두 곳에서 정의하며 둘 다 일별을 요구한다.

- L19: "선택 위치의 상세 예보(**시간별/일별**)와 보조 지표"
- L32: P0 행 — "최소한 '현재/**시간별/일별**' 표시 + 오류/스켈레톤"

구현 확인:

```bash
grep -nE "daily|hourly" frontend/entities/weather/model/core-weather.ts
# 50:  hourly: CoreWeatherHourlyEntry[];      ← daily 없음

grep -n "daily" frontend/entities/weather/api/openweather.ts
# 400:  minC: payload.daily[0].temp.min,
# 401:  maxC: payload.daily[0].temp.max,
```

어댑터는 `payload.daily[0]`에서 **오늘의 최저/최고만** 뽑고 나머지 일별 배열은 버린다. `CoreWeather`에 `daily` 필드가 없고, `DetailDashboard`는 `HourlyStrip`(12시간)만 렌더링한다. 다일 예보 UI는 코드베이스 어디에도 없다.

명세의 `WeatherDetailSnapshot`이 `daily: Array<{ date, minC, maxC, conditionCode }>`를 정의하고 있으므로, 데이터 계약 수준에서도 미충족이다.

따라서 **P0는 4/4가 아니라 3.5/4**이며, 스펙 커버리지 점수와 후속 작업 목록을 함께 정정했다 (이슈 #87).

## 3. 점검 중 새로 발견한 결함

기존 회고(`docs/weatherpane-retrospective.md`, PR #72로 병합됨)에 없는 항목들이다.

### 3.1 [P0] real 모드 OpenWeather API 키가 클라이언트 번들에 노출된다

`frontend/shared/api/real-weather-provider.ts:44`가 `import.meta.env.VITE_OPENWEATHER_API_KEY`를 읽는다. `VITE_` 접두사 변수는 빌드 시 정적으로 인라인된다. SSR 앱이므로 실제 클라이언트 그래프 도달 여부를 센티널 값으로 검증했다.

```bash
VITE_WEATHER_PROVIDER_MODE=real VITE_OPENWEATHER_API_KEY=SENTINEL_KEY_XYZ123 pnpm build
grep -rl "SENTINEL_KEY_XYZ123" build/client
# → build/client/assets/app-providers-BdxTaDDJ.js
```

**확인됨.** 키가 클라이언트 JS에 그대로 들어간다. 누구나 배포된 번들에서 추출할 수 있다. 초기 명세(`docs/specs.md` 전제 항목)가 "클라이언트 직접 서드파티 호출(권장하지 않음: 키 노출/쿼터)"이라고 명시적으로 경고했던 바로 그 상황이다. `real` 모드 프로덕션 배포의 차단 요인.

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

`typeof navigator === 'undefined'`가 false이고 `navigator.onLine`이 `undefined`이므로 SSR에서 `isOnline`이 falsy가 된다. 결과적으로 **모든 페이지의 서버 렌더 결과에 `role="alert"` 오프라인 배너가 포함된다.**

E2E 로그의 하이드레이션 diff가 이를 증명한다. 서버(`-`)는 오프라인 배너를, 클라이언트(`+`)는 `<aside aria-label="사이드바 내비게이션">`을 렌더링했다.

React가 클라이언트에서 복구하므로 E2E 34개는 전부 통과하지만, 실사용자는 첫 페인트에서 "오프라인 상태" 배너가 번쩍이는 것을 본다. 유닛 테스트는 jsdom(`navigator.onLine === true`)이라 잡지 못하고, E2E는 통과 여부만 보면 놓친다.

React는 하이드레이션 경고를 dev에서만 출력하므로 프로덕션 SSR HTML을 직접 확인했다.

`OfflineBanner`는 `frontend/shared/ui/app-shell.tsx:17`에 있고 `AppShell`은 셸 레이아웃의 모든 라우트를 감싸므로, 구조상 전 라우트가 영향받는다. 추론에 의존하지 않도록 셸 하위 4개 라우트를 모두 확인했다.

```bash
set -euo pipefail
VITE_WEATHER_PROVIDER_MODE=mock pnpm build >/dev/null

VITE_WEATHER_PROVIDER_MODE=mock PORT=3112 pnpm exec react-router-serve \
  ./build/server/nodejs_eyJydW50aW1lIjoibm9kZWpzIn0/index.js >/tmp/wp-routes.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT

# 기동 대기. 실패하면 grep 단계로 넘어가지 않는다.
for i in $(seq 1 20); do
  curl -fsS -o /dev/null "http://127.0.0.1:3112/" && break
  sleep 1
done

for p in "/" "/search" "/favorites" "/location/loc_seoul-jongno"; do
  n=$(curl -fsS "http://127.0.0.1:3112$p" | grep -c 'role="alert"')
  echo "$p → $n"
done
```

결과:

```text
/                            → 1
/search                      → 1
/favorites                   → 1
/location/loc_seoul-jongno   → 1
```

온라인 상태의 프로덕션 서버가 렌더링한 **4개 라우트 전부**에 오프라인 배너가 들어 있다. dev 전용 현상이 아니다.

> **리뷰 반영 (PR #86).** 최초 기록은 홈 라우트 한 곳만 확인하고 "모든 페이지"라고 썼고, 재현 명령도 PID 추적·기동 실패 감지·정리 처리가 없었다. 후자는 실제로 대가를 치렀다 — 아래 3.2.1 참조. 위 명령은 `set -euo pipefail`, `curl -fsS`, `$!` 추적, `trap` 정리, 기동 대기 루프를 포함해 서버가 죽으면 grep 단계에 도달하지 않는다.

### 3.2.1 [P1] 검증 과정에서 `pnpm start` / `pnpm preview`가 깨져 있음을 발견

`package.json`이 `./build/server/index.js`를 가리키지만 실제 산출물은 `build/server/nodejs_eyJydW50aW1lIjoibm9kZWpzIn0/index.js`에 있다. 커밋 `2528de9`가 Vercel preset을 도입하며 출력 경로가 바뀐 뒤 스크립트가 갱신되지 않았다.

```text
Error: Cannot find module '/Users/ori/repos/weatherpane/build/server/index.js'
```

첫 검증 시도에서 서버가 조용히 죽고 `curl`이 HTTP 000을 반환해, **하마터면 "프로덕션에서는 재현되지 않는다"는 잘못된 결론을 낼 뻔했다.** HTTP 상태 코드를 확인하지 않았다면 오판이 그대로 남았을 것이다. 프로덕션 빌드를 실제로 띄워보는 경로가 막혀 있다는 사실 자체가 별도 결함이다 (이슈 #84).

### 3.3 [P2] 루트 `node_modules`가 git worktree 내부를 심볼릭 링크로 참조한다

```bash
readlink node_modules/react-dom
# → ../.worktrees/fix-korean-ime/node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom
```

루트 저장소의 pnpm 가상 스토어가 `.worktrees/fix-korean-ime/` 안에 있다. 해당 worktree를 제거하면 루트 저장소의 의존성이 깨진다. E2E 스택 트레이스가 worktree 경로를 출력하는 것도 이 때문이다.

### 3.4 [P2] 죽은 컴포넌트 3개가 남아 있다

```bash
grep -rn "PlaceholderPage\|HomeNotFound\|HomeUnsupported" app frontend tests stories \
  --include="*.ts" --include="*.tsx" | grep -v "export function"
# → placeholder-page.tsx 자신의 타입 선언 3줄만 매치. 나머지 두 컴포넌트는 출력 없음.
```

죽은 컴포넌트는 하나가 아니라 **셋**이다.

| 파일                                          | 상태                            |
| --------------------------------------------- | ------------------------------- |
| `frontend/shared/ui/placeholder-page.tsx`     | 호출 지점 0                     |
| `frontend/pages/home/ui/home-not-found.tsx`   | 호출 지점 0 (4차 리뷰에서 발견) |
| `frontend/pages/home/ui/home-unsupported.tsx` | 호출 지점 0 (4차 리뷰에서 발견) |

`placeholder-page.tsx`는 T01 스캐폴딩 잔재로, 영문 UI 문구("South Korea weather app", "Location placeholder"), 디자인 토큰을 우회한 raw Tailwind 색상(`slate-*`, `sky-*`), 그리고 이제는 존재하지 않는 라우트 규약(`/location/seoul-jongno`, 현재는 `loc_` 접두사)을 담고 있다.

### 3.5 [P2] 살아 있는 UI에도 언어·토큰 규칙 위반이 남아 있다

> **정정 (PR #86 2차 리뷰 반영).** 최초 작성은 "회고가 지적한 영문 문구·구 토큰의 실체는 `PlaceholderPage` 하나이며 나머지 UI는 일관됐다"고 결론지었다. **틀렸다.** 사용자에게 실제로 보이는 화면에 더 많이 남아 있다.
>
> 최초 조사가 놓친 이유는 grep 범위였다. `frontend/pages`와 `frontend/shared/ui`만 훑어 `app/root.tsx`를 제외했고, 색상은 `bg-*`만 검색해 `text-*`를 빠뜨렸고, 영문 문구는 따옴표로 감싼 문자열만 찾아 JSX 텍스트 노드를 통째로 놓쳤다.

> **재정정 (PR #86 4차 리뷰).** 아래 목록은 2차에서 만들어 3차까지 살아남았으나 틀린 것이었다. **렌더 경로를 확인하지 않고 grep 결과를 그대로 "살아 있는 UI"라고 불렀다.** 실제로는 13곳 중 9곳이 도달 불가였고, 반대로 grep 정규식이 구두점·축약형·언더스코어를 배제해 살아 있는 본문 카피 3곳을 놓쳤다. 아래는 호출 지점과 prop 전달을 확인해 다시 만든 목록이다.

#### 확인 방법

```bash
# 1) 컴포넌트별 호출 지점
grep -rn "\bHomeConfigError\b" app frontend --include="*.tsx" | grep -v "export function"

# 2) 호출 지점이 실제로 넘기는 prop 확인 (선택적 prop은 가드 뒤에 숨는다)
sed -n '40,50p' frontend/app/providers/app-providers.tsx
sed -n '15,45p' frontend/pages/home/ui/home-page.tsx
```

#### A. 도달 가능한 영문 문구 (7곳)

| 위치                           | 문구                                                   |
| ------------------------------ | ------------------------------------------------------ |
| `home-config-error.tsx:25`     | Settings Update Needed                                 |
| `home-config-error.tsx:28`     | Your travel concierge needs a quick adjustment… (본문) |
| `home-connection-error.tsx:41` | Connection Interrupted                                 |
| `home-connection-error.tsx:44` | We're having trouble reaching the horizon… (본문)      |
| `home-connection-error.tsx:54` | Retry Connection                                       |
| `home-connection-error.tsx:71` | Error Code: CONNECTION_FAILED                          |
| `search-page.tsx:306`          | Korea catalog search                                   |

`HomeConfigError`는 `app-providers.tsx:45`(프로덕션 설정 오류 오버레이)와 `home-page.tsx:19`에서, `HomeConnectionError`는 `home-page.tsx:37`에서 렌더링된다. 본문 카피 2곳과 `Error Code:` 줄은 최초 grep이 놓쳤다 — 정규식이 마침표·`&apos;`·언더스코어를 문자 클래스에서 빼놓았다.

#### B. 도달 불가 — 선택적 prop 가드 뒤 (3곳)

| 위치                           | 문구               | 가드                                                               |
| ------------------------------ | ------------------ | ------------------------------------------------------------------ |
| `home-config-error.tsx:52`     | Open Settings      | `{onOpenSettings && …}` — 두 호출 지점 모두 `error`만 전달         |
| `home-config-error.tsx:61`     | Try Again          | `{onRetry && …}` — 동일                                            |
| `home-connection-error.tsx:63` | Go to Saved Places | `{onGoToSavedPlaces && …}` — `home-page.tsx:37`은 `onRetry`만 전달 |

`home-connection-error.tsx:5`에 이유가 주석으로 남아 있다: "WP-017 즐겨찾기 구현 전까지는 전달하지 않으면 버튼을 숨깁니다." 즉 의도된 미연결이다. 앞선 "Open Settings CTA가 어디로 가는가"라는 질문도 여기서 해소된다 — **아무 데도 가지 않는다. 렌더링 자체가 안 된다.**

#### C. 죽은 컴포넌트 — 호출 지점 0 (6곳)

```bash
grep -rn "\bHomeNotFound\b\|\bHomeUnsupported\b" app frontend --include="*.tsx" | grep -v "export function"
# (출력 없음)
```

| 파일                   | 문구                                                 |
| ---------------------- | ---------------------------------------------------- |
| `home-not-found.tsx`   | Lost in the Mist / Take me Home / Check Forecast     |
| `home-unsupported.tsx` | Feature Unavailable / Return Home / Search Locations |

`PlaceholderPage`와 같은 성격의 죽은 코드다. §3.4의 범위에 포함시켜야 한다.

#### D. raw Tailwind 색상 — 살아 있는 컴포넌트 3개 파일

```bash
grep -rnoE "\b(text|bg|border)-(slate|sky|zinc|gray|neutral|stone|white|black)(\/[0-9]+)?(-[0-9]{2,3}(\/[0-9]+)?)?" \
  app frontend --include="*.tsx" | grep -v placeholder-page
```

| 파일                                     | 값                                                                                                      | 렌더 경로                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `app/root.tsx` (ErrorBoundary, L103~109) | `text-sky-300`, `text-white`, `text-slate-300`, `text-slate-200`, `border-slate-800`, `bg-slate-950/80` | L82에서 export되는 전역 오류 경계          |
| `home-config-error.tsx:12`               | `bg-white/50`                                                                                           | `app-providers.tsx:45`, `home-page.tsx:19` |
| `detail-aqi-card.tsx`                    | `bg-black/40`                                                                                           | `detail-dashboard.tsx:152`                 |
| `detail-uv-card.tsx`                     | `bg-black/40`                                                                                           | `detail-dashboard.tsx:153`                 |

최초 목록은 `app/root.tsx` 하나만 담았다. 4차 리뷰가 `home-config-error.tsx`를 지적했고, 그 김에 `white|black`을 포함해 다시 훑으니 상세 화면 카드 2개가 더 나왔다. **이 둘은 리뷰어도 나도 놓쳤던 것이다** — 정상 경로에서 매일 렌더링되는 컴포넌트다.

#### 정리

- 실제 사용자 대면 부채: 영문 문구 **7곳**, raw 색상 **4개 파일**
- 죽은 코드로 이관: 영문 문구 6곳 (`home-not-found`, `home-unsupported`)
- 의도된 미연결: 3곳 (WP-017 대기)

이슈 #88을 이 구분에 맞춰 갱신했고, #82(죽은 코드 제거)에 두 컴포넌트를 추가했다.

## 4. 프로세스 관찰

### 4.1 [철회] "회고 문서가 main에 병합되지 않았다"는 오판이었다

**이 절의 최초 결론은 완전히 틀렸다.** 회고 문서는 PR #72로 2026-06-01에 `main`에 병합돼 있다.

```bash
git fetch origin
git rev-parse --short main origin/main   # f639123 (로컬, stale) / c6b34ce (실제)
git log --oneline main..origin/main
# c6b34ce docs(journal): 범위 밖 의존성 알림 기록
# 90315bc docs(retrospective): Weatherpane 프로젝트 회고 작성

gh pr view 72 --json state,mergedAt
# MERGED / 2026-06-01T09:08:51Z
```

원인은 단순하다. **점검 시작 시 `git fetch`를 하지 않았다.** 로컬 `main`이 2개월 가까이 뒤처져 있었고, 그 격차가 정확히 회고 병합분이었다. `ls docs/weatherpane-retrospective.md`가 "없음"을 반환한 것을 "병합 안 됨"의 증거로 삼았으나, 실제로는 "내 워킹트리가 낡았음"의 증거였다.

파생된 오류들:

- 이슈 #76(회고 병합)은 이미 완료된 작업이었다 → 클로즈
- 이슈 #83의 "#76 병합 후 브랜치 삭제" 선행 제약도 무의미 → 제거
- §5의 프로세스 규율 감점 근거 중 "종료된 이슈의 산출물 미병합" 항목 철회

**교훈:** 원격 상태에 대한 주장을 하기 전에 fetch한다. 로컬 워킹트리의 부재는 원격의 부재가 아니다. 아이러니하게도 이 점검의 주제가 "테스트 통과와 실제 배포물은 다르다"였는데, 같은 종류의 실수를 git에서 저질렀다.

### 4.2 stale 브랜치 36개 — 전부 정리 대상

`origin/main` 기준으로 센다. §4.1에서 로컬 `main`이 낡았음이 드러났으므로 비교 ref도 동기화된 것을 쓴다.

```bash
git fetch origin --prune
git branch --no-merged origin/main | wc -l                                  # 37
git branch --no-merged origin/main | grep -vc "docs/85-docs-status-review"  # 36
```

37개 중 1개는 이 PR의 작업 브랜치이므로 정리 대상은 **36개**다.

> **정정 (PR #86 4차 리뷰).** 최초 기록은 "35개"였고 `git branch --no-merged main`(낡은 로컬 ref)으로 셌다. 기준 커밋을 `origin/main`으로 고쳐놓고 이 절의 명령만 그대로 둔 것이다. fetch·prune 후 실제 수는 37개이며, 현재 PR 브랜치를 빼면 36개다.

전부 squash merge 잔재로 보인다. 판별은 브랜치 고유 파일·커밋 메시지의 `origin/main` 존재 여부로 했다 — 예: `fix/63-hangul-ime`의 수정은 `f7dc7e2`에 동일 메시지로 존재한다. **다만 36개를 전수 대조하지는 않았다. 표본 3개(`feat/wp-012-home-dashboard`, `fix/63-hangul-ime`, `feat/25-design-tokens`)만 확인했으므로 "전부"는 표본 기반 추정이다.** 실제 삭제 전에는 이슈 #83에서 개별 확인이 필요하다.

**확인된 범위에서 작업 유실은 없다.** §4.1 정정에 따라 `docs/71-project-retrospective`도 병합 완료 상태이므로 **알려진 미병합 브랜치는 0개**다.

다만 이 목록이 무의미해진 상태 자체는 비용이다. 진짜 미병합 브랜치가 생겨도 눈에 띄지 않고, 실제로 이번에 내가 그 노이즈 속에서 `docs/71-project-retrospective`를 "미병합"으로 오독했다.

## 5. 이터레이션 평가

단일 점수는 반증 불가능하므로 축별로 나눈다.

| 축              | 점수   | 근거                                                                                                                                                                                                                            |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 스펙 커버리지   | 6/10   | P0 3.5/4 — Detail의 일별 예보 미구현(#87). P1 2개(Settings, SW) 모두 미착수. P2 1/2.                                                                                                                                            |
| 엔지니어링 품질 | 7.5/10 | lint·typecheck 무결, 486 유닛 + 34 E2E 통과, FSD 경계 준수, bootstrap 상태를 discriminated union으로 모델링. 감점: SSR 하이드레이션 결함이 전 테스트 계층을 통과, 8.3MB 클라이언트 청크가 상세 라우트까지 로드, 죽은 코드 잔존. |
| 문서 정합성     | 5/10   | 가장 약한 축. `specs-favorites.md` 무갱신, cutoff 수치 모순, 제품 규칙 역기록 누락, 살아 있는 UI의 한국어 규칙 위반 7곳(#88).                                                                                                   |
| 프로덕션 준비도 | 4/10   | API 키 노출이 `real` 모드를 차단. 번들 예산 기준·CI 게이트 부재(크기 자체는 §6에서 실측), SW 없음, 모니터링·쿼터 대응 없음. `mock` 모드 데모로는 완성.                                                                          |
| 프로세스 규율   | 8/10   | 22개 태스크를 이슈→브랜치→PR로 일관 수행, 커밋 메시지 규약 준수, 종료 이슈의 산출물도 전부 병합됨. 감점: 브랜치 정리 부재.                                                                                                      |

**종합: 6/10 — 잘 만들어진 MVP이나 프로덕션 준비 상태는 아니다.**

> **점수 변경 이력 (PR #86 리뷰 반영).** 두 차례 조정을 거쳐 최종 6/10이다.
>
> | 회차 | 변경                                    | 사유                                                    |
> | ---- | --------------------------------------- | ------------------------------------------------------- |
> | 1차  | 스펙 커버리지 7 → 6, 종합 6.0 → 5.8     | P0 Weather Detail 일별 예보 미구현 확인 (§2.5.1)        |
> | 2차  | 프로세스 규율 7 → 8, 종합 5.8 → **6.0** | 회고 미병합이 오판이었음이 드러나 감점 근거 소멸 (§4.1) |

강점은 명확하다. 상태 경계 설계(Query 캐시 ≠ 영속 스냅샷), unsupported 위치의 active location 보호, 한국어 IME/URL 상태 분리는 이 규모 앱에서 흔히 놓치는 부분을 제대로 짚었다. 테스트가 제품 규칙을 문서화하는 수준까지 갔다.

약점은 문서와 운영이다. 코드는 스스로를 설명하지만, 명세 문서는 이제 코드보다 초기 구상에 더 가깝다. 그리고 `real` 모드는 지금 배포하면 안 된다.

평가에서 한 가지 패턴이 반복된다. **모든 테스트 계층이 초록인 상태에서, 빌드 산출물이나 실행 중인 프로덕션 서버를 직접 봐야만 보이는 결함이 4건 나왔다.**

| 결함                         | 발견 수단                           |
| ---------------------------- | ----------------------------------- |
| API 키 클라이언트 노출 (#73) | 센티널 빌드 후 `build/client` grep  |
| SSR 오프라인 배너 (#74)      | 프로덕션 서버 기동 후 HTML 검사     |
| 8.3MB 카탈로그 청크 (#80)    | 번들 크기 실측 + import 그래프 확인 |
| 깨진 `pnpm start` (#84)      | 프로덕션 번들 기동 시도             |

이 4건은 "산출물 검사로만 발견되는 결함"이라는 하나의 범주다. 이번 점검이 찾은 전체 항목은 이보다 많다 — §3에는 `node_modules` worktree 참조(#79)와 미사용 `PlaceholderPage`(#82)가, §2.5.1에는 일별 예보 미구현(#87)이 추가로 있으며, 이들은 각각 `readlink`, grep, 명세 대조로 발견됐다.

핵심은 개수가 아니라 범주다. lint·typecheck·486 유닛·34 E2E 어느 것도 위 표의 4건 중 하나도 잡지 못했다.

현재 검증 체계에는 "테스트가 통과하는가"는 있지만 **"배포되는 것이 무엇인가"를 확인하는 단계가 없다.** 개별 수정보다 아래 세 가지를 CI에 넣는 것이 우선순위가 높다.

- 번들 예산 검사 (#80 재발 방지)
- 프로덕션 번들 기동 스모크 (#84 재발 방지, 그리고 #74 같은 SSR 결함의 검증 경로 확보)
- 하이드레이션 경고를 E2E 실패로 처리 (#74 재발 방지)

`pnpm build`가 성공한다는 것과 빌드된 것이 동작한다는 것은 다른 명제다. 이번 점검에서 그 간극이 네 번 드러났다.

### 5.1 이 문서 자체에도 같은 문제가 있다

PR #86 리뷰에서 이 문서의 사실 주장이 **6건** 틀린 것으로 드러났다. 회고 미병합(§4.1), P0 Detail 완료(§2.5.1), 규칙 출처 2회(§2.2), 명세 개정 횟수(§2.1), 살아 있는 UI 일관성(§3.5).

원인은 하나로 수렴한다. **검증 범위를 미리 좁혀놓고 그 안에서 나온 결과를 전체에 대한 결론으로 썼다.**

| 틀린 주장             | 좁혀놓은 범위                                        |
| --------------------- | ---------------------------------------------------- |
| 회고 미병합           | `git fetch` 없이 로컬 `main`만 조회                  |
| 규칙 출처 = AGENTS.md | `docs/skills/`, `docs/tasks/`, `docs/legacy/` 미검색 |
| 명세 7회를 5회로      | `git log` 출력을 세지 않고 눈대중                    |
| 나머지 UI 일관        | `app/` 제외, `text-*` 제외, JSX 텍스트 노드 제외     |
| P0 4/4 완료           | 화면 존재 여부만 보고 명세 항목별 대조 안 함         |

#### 3차 리뷰: 실패 모드가 바뀌었다

위 6건을 고친 뒤 3차 리뷰에서 **5건이 더** 나왔다. 이번엔 사실 오류가 아니라 **문서 내부 불일치**였고, 전부 내가 고치는 과정에서 만들었다.

| 3차 지적                         | 원인                                                     |
| -------------------------------- | -------------------------------------------------------- |
| 규칙 표는 4개인데 #75 범위는 3개 | 표에 `Undo timeout 5s` 행을 추가하고 아래 문장을 안 고침 |
| SW가 §2.5는 P1, #78은 P2         | 명세 우선순위와 트리아지 우선순위를 구분해 쓰지 않음     |
| "번들 예산 미측정"               | 실제로는 측정했고 없는 건 기준·게이트인데 뭉뚱그림       |
| 종합 6/10인데 정정 노트는 5.8    | 2차 조정 후 1차 노트를 안 고침                           |
| 증거 수준 서술이 부정확          | §3.2.1엔 명령이 없고 §2엔 있는데 반대로 씀               |

1·2차의 원인이 "검증 범위를 좁혀놓고 전체 결론을 냈다"였다면, 3차의 원인은 다르다. **지적받은 절만 국소적으로 고치고 문서 전체를 다시 읽지 않았다.** 한 곳을 고치면 그 사실을 참조하는 다른 절이 낡는데, 그 연쇄를 추적하지 않았다.

3차 수정에서는 절별 패치 후 전체 숫자 주장(점수, 규칙 개수, 우선순위, 결함 건수)을 일괄 재검사했다.

#### 4차 리뷰: grep을 근거로 착각했다

3차 수정 후 4차에서 **6건이 더** 나왔다. 이번 실패 모드는 또 달랐다.

| 4차 지적                                 | 원인                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| "살아 있는 UI" 13곳 중 9곳이 도달 불가   | grep 히트를 렌더 경로 확인 없이 "살아 있다"고 단정   |
| 살아 있는 본문 카피 3곳 누락             | 정규식 문자 클래스에 `.`, `&apos;`, `_` 미포함       |
| raw 색상 목록에 `home-config-error` 누락 | `white`/`black`을 색상 패턴에서 제외                 |
| 브랜치 35개 (실제 37)                    | 기준을 `origin/main`으로 고치고 이 절 명령만 안 고침 |
| 이슈 분류 22/6/6 (실제 23/4/4/2/1)       | 세어보지 않고 기억으로 씀                            |
| undo timeout legacy 출처 `—`             | `docs/legacy/prompt.md:987`에 있는데 미검색          |

1·2차는 "검증 범위를 좁혀놓고 전체 결론을 냄", 3차는 "국소 패치 후 전체 미재검토", 4차는 **"grep 결과를 사실로 취급"**이다. 세 실패 모드는 다르지만 공통점이 있다. **한 번의 값싼 조회로 나온 결과를 검증된 사실처럼 문서에 썼다.**

특히 §3.5는 이 문서에서 실행 가능한 이슈(#88)를 직접 만들어낸 절이라 비용이 컸다. 도달 불가 문구 9곳을 "사용자에게 보이는 부채"로 올려놨으니, 그대로 작업했다면 렌더링되지도 않는 버튼 카피를 번역하는 데 시간을 썼을 것이다.

4차 수정에서는 §3.5를 호출 지점과 prop 전달 확인으로 다시 만들었고, 그 과정에서 리뷰어도 지적하지 않은 raw 색상 2개(`detail-aqi-card`, `detail-uv-card` — 상세 화면에서 매일 렌더링된다)를 추가로 찾았다.

리뷰어의 지적대로 이 문서의 주장에는 자동 정합성 검사가 없다. **네 라운드에 걸쳐 총 17건이 리뷰로만 걸러졌고, 내가 스스로 찾은 것은 0건이다.**

**이 문서를 읽는 사람에게 — 절별 증거 수준은 아래와 같다.**

| 절                 | 증거                                                      |
| ------------------ | --------------------------------------------------------- |
| §2.1, §2.2, §2.5.1 | 명령 + 출력 있음                                          |
| §3.1, §3.2, §3.5   | 명령 + 출력 있음                                          |
| §4.1               | 명령 + 출력 있음                                          |
| §6 (#80 번들 실측) | 명령 + 출력 있음 (§3이 아니라 §6에 있다)                  |
| §3.2.1             | **오류 출력만 있고 실행 명령이 없다**                     |
| §3.4               | **`PlaceholderPage` 미참조를 보이는 명령·출력이 없다**    |
| §4.2               | **"전부 잔재"의 근거가 표본 3개뿐 (36개 전수 대조 아님)** |
| §2.3, §2.4         | 문서 대조 결과만 있고 재현 명령이 없다                    |

즉 "§3은 재현 가능하고 §2·§4는 아니다"라는 단순한 구분은 성립하지 않는다. 근거가 빠진 곳은 **§3.2.1, §3.4, §4.2, §2.3, §2.4** 다섯 곳이다. 이 절들의 주장을 근거로 작업하기 전에는 직접 확인하는 편이 낫다.

§3.4와 §4.2는 4차 리뷰에서 추가로 지적받았다. **증거 부족 절을 열거하는 표 자체가 불완전했다**는 뜻이다.

교훈은 §3에서 얻은 것과 같은 모양이다. 테스트가 초록인 것과 배포물이 올바른 것이 다르듯, 문서에 근거가 적혀 있는 것과 그 근거가 맞는 것도 다르다.

## 6. 도출한 후속 이슈

회고 §8의 6개 항목을 뼈대로, HEAD 대비 재검증하고 누락분을 추가했다. 회고가 다루지 않은 것: Settings 화면 부재, API 키 노출(회고는 "운영 수준으로 끌어올린다"로 완화 표현), SSR 하이드레이션 결함, node_modules 심볼릭 링크.

우선순위 순:

| #       | 우선순위 | 제목                                                                              |
| ------- | -------- | --------------------------------------------------------------------------------- |
| #73     | P0       | real 모드 OpenWeather API 키가 클라이언트 번들에 노출됨                           |
| #74     | P1       | Node 24에서 `navigator.onLine`이 undefined여서 서버가 항상 오프라인 배너를 렌더링 |
| #75     | P1       | 명세 문서와 구현 사이의 드리프트 해소                                             |
| ~~#76~~ | —        | ~~프로젝트 회고 문서를 main에 병합~~ → **철회·클로즈** (§4.1 오판, 이미 병합됨)   |
| #77     | P1       | `/settings` 화면 구현                                                             |
| #80     | P1       | 카탈로그 청크가 클라이언트 번들 8.3MB(gzip 847KB)를 차지                          |
| #84     | P1       | `pnpm start`·`preview`가 잘못된 서버 번들 경로를 가리켜 실행 불가                 |
| #87     | P1       | Detail 화면 일별 예보 미구현 — P0 명세 미충족 (리뷰에서 발견)                     |
| #78     | P2       | Service Worker 기반 앱 셸·에셋 캐시 도입                                          |
| #79     | P2       | 루트 `node_modules`가 `.worktrees/fix-korean-ime` 가상 스토어를 참조              |
| #81     | P2       | `useFavorites`의 단일 인스턴스 가정 제거                                          |
| #88     | P2       | 살아 있는 영문 문구 7곳·raw 색상 4개 파일 한국어/토큰 규칙 적용                   |
| #82     | P3       | 미사용 `PlaceholderPage` 제거 (죽은 코드만, 살아 있는 UI는 #88)                   |
| #83     | P3       | squash merge 완료된 stale 브랜치 정리                                             |

### 이슈 개설 중 상향된 항목

카탈로그 번들 비용(#80)은 회고가 "성능 예산이 빡빡해지면 검토"로 유예했고 이 점검에서도 처음에는 P3로 두었으나, 실측 후 **P1로 상향**했다.

```bash
ls -lhS build/client/assets/*.js | head -2
# 8.3M  unsupported-route-context-repository-57wGnOZK.js
# 182K  entry.client-DgHsRUOR.js

gzip -c build/client/assets/unsupported-route-context-repository-57wGnOZK.js | wc -c
# 847465

grep -l "unsupported-route-context-repository-57wGnOZK" build/client/assets/*.js
# manifest-051072ec.js / location-CsHXZcMn.js / search-xjLNsgB_.js
```

두 번째로 큰 청크의 46배이고, 검색뿐 아니라 **상세 라우트(`location-*.js`)에서도 로드된다.** 북마크로 상세 페이지만 열어도 847KB gzip / 8.3MB 파싱 비용을 치른다. 유예할 수준이 아니다.

### 실행 순서 제약

- #79(node_modules worktree 참조) → #83(브랜치·worktree 정리). 순서를 어기면 루트 저장소 의존성이 깨진다.
- ~~#76(회고 병합) → #83~~ — 철회. 회고는 이미 병합돼 있으므로 브랜치 삭제에 선행 조건이 없다.
- #74(SSR 오프라인 판정) → #78(Service Worker). 오프라인 판정이 틀린 상태로 SW를 얹으면 원인 분리가 어렵다.
