# 2026-07-28 프로젝트 상태 점검 및 초기 명세 대비 비교

`main` HEAD `f639123` 기준. 초기 명세와 현재 명세를 비교하고, 현재 이터레이션을 평가한 뒤 후속 이슈를 도출한 기록이다.

## 1. 검증된 건강 상태

모두 실제로 실행해서 확인했다.

| 항목             | 명령             | 결과                                  |
| ---------------- | ---------------- | ------------------------------------- |
| Lint             | `pnpm lint`      | 통과 (exit 0)                         |
| Typecheck        | `pnpm typecheck` | 통과 (exit 0)                         |
| Unit/Integration | `pnpm test:unit` | 50개 파일 / 486개 테스트 통과 (6.16s) |
| E2E              | `pnpm test:e2e`  | 34개 통과 (16.5s)                     |
| Build            | `pnpm build`     | 성공                                  |

이슈 트래커: 34개 전부 CLOSED, 열린 이슈 0개. WP-001~WP-022 태스크 22개 + 버그 6개 + 문서 6개.

단, E2E는 34개 전부 통과했지만 dev 서버 로그에 **하이드레이션 불일치 경고**가 남았다. 통과 여부만 보면 놓치는 신호다 (아래 3.2).

## 2. 초기 명세 대비 현재 명세 비교

### 2.1 명세 문서의 갱신 이력이 비대칭이다

```bash
git log --oneline --follow -- docs/specs.md        # 최초 커밋 이후 5회 개정
git log --oneline --follow -- docs/specs-favorites.md  # 8dd1c2b 최초 커밋 1회뿐
```

- `docs/specs.md`는 구현을 따라가며 개정됐다. IndexedDB → versioned Web Storage 정정, `RawGpsFallbackLocation` / `CurrentLocationResult` 계약 추가, 저장 키 스키마 표 갱신, 스냅샷 예시 정정.
- `docs/specs-favorites.md`는 **최초 커밋 이후 한 번도 갱신되지 않았다.** 여전히 IndexedDB object store, `GET/POST/PATCH/DELETE /v1/favorites`, ETag + If-Match 낙관적 동시성, SyncQueue를 명세하고 있다. 이 중 구현된 것은 없다.

### 2.2 역방향 드리프트가 더 심각하다

실질적 제품 규칙이 명세 문서가 아니라 `AGENTS.md`에 쌓였다. 확인:

```bash
git show 8dd1c2b:docs/specs-favorites.md | grep -niE "undo|최대|6개"  # 무관한 1건만
git show 8dd1c2b:docs/specs.md | grep -niE "undo|되돌리|6개"          # 0건
```

즉 아래 규칙들은 **초기 명세 어디에도 없고**, `AGENTS.md`에만 존재한다.

- Favorites max is 6
- Undo restores exact previous favorite state
- Only the latest removal is undoable
- Favorites order is manual and persisted

FAV-01~FAV-12, UX-01~UX-11 확정 결정 로그에 이 규칙들이 역기록되지 않았다. 명세 문서를 읽는 사람은 이 규칙의 존재를 알 수 없다.

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
| P0            | Home / Search / Detail / Favorites            | 완료                                                              |
| P1            | Settings (테마·단위·로컬 데이터 초기화)       | **미구현** — 라우트·`unitTemp`·`reduceMotion`·캐시 삭제 전부 없음 |
| P1            | Service Worker (앱 셸 precache + 런타임 캐시) | **미구현** — 코드베이스에 SW/Workbox 참조 0건                     |
| P2            | 원격 스케치 매니페스트                        | 완료                                                              |
| P2            | 고급 오프라인 동기화                          | 미구현 (의도된 범위 밖)                                           |
| —             | Favorites 서버 동기화 (REST/ETag/SyncQueue)   | 미구현 — 로컬 저장소 MVP로 축소                                   |

Favorites 서버 동기화와 SW는 의도적 범위 축소로 볼 수 있으나, 명세 문서가 그렇게 표기하지 않고 있다는 점이 문제다.

## 3. 점검 중 새로 발견한 결함

기존 회고(`docs/weatherpane-retrospective.md`, 미병합)에 없는 항목들이다.

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

### 3.3 [P2] 루트 `node_modules`가 git worktree 내부를 심볼릭 링크로 참조한다

```bash
readlink node_modules/react-dom
# → ../.worktrees/fix-korean-ime/node_modules/.pnpm/react-dom@19.2.4_react@19.2.4/node_modules/react-dom
```

루트 저장소의 pnpm 가상 스토어가 `.worktrees/fix-korean-ime/` 안에 있다. 해당 worktree를 제거하면 루트 저장소의 의존성이 깨진다. E2E 스택 트레이스가 worktree 경로를 출력하는 것도 이 때문이다.

### 3.4 [P2] `PlaceholderPage`가 죽은 코드로 남아 있다

`frontend/shared/ui/placeholder-page.tsx`는 어디에서도 import되지 않는다. T01 스캐폴딩 잔재로, 영문 UI 문구("South Korea weather app", "Location placeholder"), 디자인 토큰을 우회한 raw Tailwind 색상(`slate-*`, `sky-*`), 그리고 이제는 존재하지 않는 라우트 규약(`/location/seoul-jongno`, 현재는 `loc_` 접두사)을 담고 있다. 회고가 "영문 문구와 구 토큰 alias가 남아 있다"고 지적한 실체가 이 파일이다. 나머지 UI는 토큰 체계가 일관됐다.

## 4. 프로세스 관찰

### 4.1 이슈 #71 회고 문서가 main에 병합되지 않았다

`docs/71-project-retrospective` 브랜치에 `docs/weatherpane-retrospective.md`(572줄)와 저널이 있으나 `main`에는 없다. 이슈는 CLOSED 상태다. `AGENTS.md`의 "docs를 코드베이스와 동기 유지" 규칙 위반이며, 프로젝트에서 가장 가치 있는 문서가 유실 위험에 있다.

### 4.2 stale 브랜치 ~35개

`git branch --no-merged main`이 35개를 보고하지만, squash merge 잔재다. 판별은 브랜치 고유 파일의 main 존재 여부로 했다 — 예: `fix/63-hangul-ime`의 수정은 main 커밋 `f7dc7e2`에 동일 메시지로 존재한다. **작업 유실은 없다.** 정리 대상일 뿐이며, 실제 미병합은 `docs/71-project-retrospective` 하나다.

## 5. 이터레이션 평가

단일 점수는 반증 불가능하므로 축별로 나눈다.

| 축              | 점수   | 근거                                                                                                                                                                              |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 스펙 커버리지   | 7/10   | P0 4/4 완료. P1 2개(Settings, SW) 모두 미착수. P2 1/2.                                                                                                                            |
| 엔지니어링 품질 | 8.5/10 | lint·typecheck 무결, 486 유닛 + 34 E2E 통과, FSD 경계 준수, bootstrap 상태를 discriminated union으로 모델링. 감점: SSR 하이드레이션 결함이 전 테스트 계층을 통과, 죽은 코드 잔존. |
| 문서 정합성     | 5/10   | 가장 약한 축. `specs-favorites.md` 무갱신, cutoff 수치 모순, AGENTS.md 규칙 역기록 누락, 회고 미병합.                                                                             |
| 프로덕션 준비도 | 4/10   | API 키 노출이 `real` 모드를 차단. SW 없음, 모니터링·쿼터 대응 없음. `mock` 모드 데모로는 완성.                                                                                    |
| 프로세스 규율   | 7/10   | 22개 태스크를 이슈→브랜치→PR로 일관 수행, 커밋 메시지 규약 준수. 감점: 브랜치 정리 부재, 종료된 이슈의 산출물 미병합.                                                             |

**종합: 6.5/10 — 잘 만들어진 MVP이나 프로덕션 준비 상태는 아니다.**

강점은 명확하다. 상태 경계 설계(Query 캐시 ≠ 영속 스냅샷), unsupported 위치의 active location 보호, 한국어 IME/URL 상태 분리는 이 규모 앱에서 흔히 놓치는 부분을 제대로 짚었다. 테스트가 제품 규칙을 문서화하는 수준까지 갔다.

약점은 문서와 운영이다. 코드는 스스로를 설명하지만, 명세 문서는 이제 코드보다 초기 구상에 더 가깝다. 그리고 `real` 모드는 지금 배포하면 안 된다.

## 6. 도출한 후속 이슈

회고 §8의 6개 항목을 뼈대로, HEAD 대비 재검증하고 누락분을 추가했다. 회고가 다루지 않은 것: Settings 화면 부재, API 키 노출(회고는 "운영 수준으로 끌어올린다"로 완화 표현), SSR 하이드레이션 결함, node_modules 심볼릭 링크.

우선순위 순:

| #   | 우선순위 | 제목                                                                              |
| --- | -------- | --------------------------------------------------------------------------------- |
| #73 | P0       | real 모드 OpenWeather API 키가 클라이언트 번들에 노출됨                           |
| #74 | P1       | Node 24에서 `navigator.onLine`이 undefined여서 서버가 항상 오프라인 배너를 렌더링 |
| #75 | P1       | 명세 문서와 구현 사이의 드리프트 해소                                             |
| #76 | P1       | 프로젝트 회고 문서를 main에 병합 (이슈 #71 산출물 미반영)                         |
| #77 | P1       | `/settings` 화면 구현                                                             |
| #80 | P1       | 카탈로그 청크가 클라이언트 번들 8.3MB(gzip 847KB)를 차지                          |
| #78 | P2       | Service Worker 기반 앱 셸·에셋 캐시 도입                                          |
| #79 | P2       | 루트 `node_modules`가 `.worktrees/fix-korean-ime` 가상 스토어를 참조              |
| #81 | P2       | `useFavorites`의 단일 인스턴스 가정 제거                                          |
| #82 | P3       | 미사용 `PlaceholderPage` 제거                                                     |
| #83 | P3       | squash merge 완료된 stale 브랜치 정리                                             |

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
- #76(회고 병합) → #83. 병합 전에 브랜치를 지우면 572줄이 유실된다.
- #74(SSR 오프라인 판정) → #78(Service Worker). 오프라인 판정이 틀린 상태로 SW를 얹으면 원인 분리가 어렵다.
