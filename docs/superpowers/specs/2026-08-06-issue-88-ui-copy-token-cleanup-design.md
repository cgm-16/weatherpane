# 이슈 88 — 살아 있는 오류·빈 상태 화면 영문 문구 및 raw Tailwind 색상 정리 설계

## 목표

`AGENTS.md`의 한국어 UI 문구 규칙과 `docs/skills/design-tokens.md`의 디자인 토큰 규칙을 실제 렌더링되는 화면에 맞춘다. 이슈 88이 렌더 경로와 prop 전달을 확인해 재작성한 목록(도달 가능 영문 문구 7곳, raw 색상 사용 4개 파일)을 반영하고, 함께 발견된 판단 필요 지점 3가지를 Ori와 확정한 뒤 그 결정을 구현 경계로 삼는다.

이슈 88 본문 자체가 PR #86 4차 리뷰에서 정정된 결과다 — 최초 조사는 grep 히트를 렌더 경로 확인 없이 "살아 있는 UI"로 올렸고, 13곳 중 9곳이 도달 불가였다. 이번 조사는 실제 호출 지점과 prop 전달을 파일 단위로 직접 확인해 이슈 본문과 대조했다.

## 선택한 접근

이슈가 이미 정확한 파일·문구·색상 목록을 제공하므로, 새 컴포넌트나 추상화를 만들지 않고 지정된 파일만 최소 변경한다. 판단이 필요한 3개 지점은 각각 확정된 방향으로 처리한다.

1. **MD3 스타일 미정의 토큰 9개** (`text-on-surface-variant`, `bg-secondary-container`, `bg-outline-variant`, `bg-primary-container`, `text-on-primary`, `text-on-secondary-fixed`, `bg-surface-container-high`, `bg-surface-container-lowest`, `text-on-surface`) — `home-config-error.tsx`/`home-connection-error.tsx`에서 참조되지만 `tokens.css` 어디에도 정의돼 있지 않다(grep으로 확인, `--color-surface-container-highest`만 존재). Tailwind v4 `@theme` 체계에서 미정의 유틸리티는 조용히 아무 CSS도 만들지 않으므로, 오프라인 펄스 점과 버튼 배경이 현재 스타일 없이 렌더링된다. **이 이슈 범위에 포함하지 않고 후속 이슈로 분리한다.** 이슈 88의 §3에 나열된 4개 파일에만 집중하고, 두 파일의 라이트/다크 대비 검증은 부분적임을 PR에 명시한다.
2. **`bg-black/40` 모달 스크림 색상** (detail-aqi-card.tsx, detail-uv-card.tsx) — 대응하는 토큰이 없다. `foreground`처럼 테마에 따라 반전되는 토큰을 재사용하면 다크 모드에서 밝은 오버레이가 되어 스크림 목적에 맞지 않는다. **새 `--color-scrim` 토큰을 신설한다.**
3. **도달 불가 영문 문구 3곳** ("Open Settings" / "Try Again" / "Go to Saved Places") — 각각의 prop(`onOpenSettings`, `onRetry`, `onGoToSavedPlaces`)이 저장소 전체에서 가드문 자신 외에 참조되지 않음을 확인했다. 이슈 작성 시점과 달리 `/settings`(#77)는 이후 구현·병합됐지만, 내비게이션 연결은 카피/토큰 정리 PR의 범위를 넘는 실제 기능 작업이다. **이번 PR에서는 손대지 않는다.**

### 검토했지만 선택하지 않은 접근

1. MD3 미정의 토큰 9개를 이 PR에서 함께 정의하는 방식 — 이슈가 명시적으로 비범위로 둔 "디자인 토큰 체계 자체 변경"에 가까워지고, 이슈가 지정한 4개 파일이라는 경계를 넘는다.
2. `bg-black/40`을 `bg-foreground/40`으로 단순 치환하는 방식 — 새 토큰이 필요 없다는 장점이 있지만 다크 모드에서 `foreground`가 거의 흰색(`#e5e2e1`)이라 배경을 밝히는 반대 효과를 낸다.
3. "Open Settings"를 `/settings` 라우트로 즉시 연결하는 방식 — `/settings`가 이제 존재하므로 가능하지만, `app-providers.tsx`/`home-page.tsx`를 거쳐 내비게이션을 새로 배선하는 작업이라 카피·토큰 정리라는 PR 성격을 벗어난다.
4. 정규식/grep 기반 재발 방지 대신 JSX 텍스트 노드를 파싱하는 커스텀 ESLint 규칙을 이번 PR에서 함께 구현하는 방식 — 규칙 패키지, `RuleTester`, flat config 연결, 필요 시 Husky/lint-staged 통합까지 필요한 별도 하위 프로젝트다. 기존에 이런 커스텀 규칙 인프라가 전혀 없음을 확인했다(유일한 선례는 `tests/**/*.e2e.ts`에 스코프된 표준 `no-restricted-imports` 규칙뿐). 후속 이슈로 분리한다.

## 상세 설계

### 영문 문구 한국어 교체 (7곳)

기존 화면들의 톤을 확인한 결과, 재시도 버튼은 일관되게 **"다시 시도"**를 쓰고("재시도"가 아님), 제목은 "~하지 못했습니다/~습니다" 형태의 짧고 사실적인 문장이며, 본문은 담백한 안내문이다. 앱의 다른 한국어 오류 문구 어디에도 영어 차용어나 은유("travel concierge", "reaching the horizon")가 없다 — `home-config-error.tsx`와 `home-connection-error.tsx`의 해당 표현은 예외적인 스타일이므로 이슈의 지시대로 기존 톤에 맞춰 정규화한다.

| 위치                           | 현재 (영문)                                                                                              | 교체 (한국어)                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `home-config-error.tsx:25`     | Settings Update Needed                                                                                   | 설정 업데이트가 필요합니다                                                 |
| `home-config-error.tsx:28`     | Your travel concierge needs a quick adjustment. It looks like an API key or location setting is missing. | API 키 또는 위치 설정이 누락된 것 같습니다. 설정을 확인해 주세요.          |
| `home-connection-error.tsx:41` | Connection Interrupted                                                                                   | 연결이 끊겼습니다                                                          |
| `home-connection-error.tsx:44` | We're having trouble reaching the horizon. Please check your signal and try again.                       | 날씨 정보를 불러오지 못했습니다. 신호 상태를 확인한 후 다시 시도해 주세요. |
| `home-connection-error.tsx:54` | Retry Connection                                                                                         | 다시 시도                                                                  |
| `home-connection-error.tsx:71` | Error Code: CONNECTION_FAILED                                                                            | 오류 코드: CONNECTION_FAILED                                               |
| `search-page.tsx:306`          | Korea catalog search                                                                                     | 대한민국 지역 검색                                                         |

`Error Code:` 라벨만 번역하고 `CONNECTION_FAILED`는 그대로 둔다 — 자연어 문구가 아니라 기계가 읽는 상수이며, 저장소의 다른 상수 처리 방식과 일치한다.

이슈가 인용한 줄 번호 중 일부는 현재 `main`과 어긋난다: `home-config-error.tsx`의 `bg-white/50`은 12번이 아니라 13번, `app-providers.tsx`의 `HomeConfigError` 렌더는 45번이 아니라 46번, `detail-dashboard.tsx`의 카드 렌더는 152/153번이 아니라 159/160번, `app/root.tsx`의 색상은 103~109번이 아니라 110~116번(컴포넌트 시작은 89번)이다. 구현 시 실제 줄 번호를 기준으로 한다.

### 디자인 토큰 교체 (4개 파일)

**`app/root.tsx` (ErrorBoundary, 110~116번)** — 이 `<main>`에는 명시적 배경이 없고 `global.css:45`의 `body { @apply bg-background text-foreground antialiased; }`를 통해 상속받는다. 현재 raw 색상(white/sky-300/slate-300/slate-200)은 어두운 배경을 전제로 튜닝돼 있지만 그 배경이 보장되지 않는다 — **라이트 모드에서 거의 흰 배경(`background` 토큰) 위에 거의 흰 텍스트(`text-white`)가 겹치는 실제 저대비 결함**이며 단순 스타일 문제가 아니다.

| 줄  | raw 클래스         | 교체 토큰               | 근거                                                                                                                                              |
| --- | ------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 110 | `text-sky-300`     | `text-muted-foreground` | `search-page.tsx:305`의 동일한 eyebrow 패턴(`text-sm font-medium tracking-[…] text-muted-foreground uppercase`)과 일치 — 같은 저장소 내 기존 선례 |
| 113 | `text-white`       | `text-foreground`       | 상속받는 `bg-background`에 맞춰 양쪽 테마 모두 올바르게 반전                                                                                      |
| 114 | `text-slate-300`   | `text-muted-foreground` | 표준 본문/보조 텍스트 토큰                                                                                                                        |
| 116 | `border-slate-800` | `border-border`         | 표준 구조 테두리 토큰                                                                                                                             |
| 116 | `bg-slate-950/80`  | `bg-card`               | 불투명도 없이도 순검정에 가깝지 않은 elevated surface — 별도 opacity 불필요                                                                       |
| 116 | `text-slate-200`   | `text-card-foreground`  | `bg-card`와 정확히 짝을 이루는 토큰                                                                                                               |

**`home-config-error.tsx:13`** — `backdrop-blur-[20px]` 유리 카드 위 `bg-white/50`. `docs/Design.md` §유리형태(Glassmorphism)가 이 패턴을 테마별로 이미 명시한다: 라이트 모드는 `surface-container-highest` 60% 불투명도, 다크 모드는 `surface-bright` 40% 불투명도. 두 토큰 모두 `tokens.css`에 이미 정의돼 있다(`--color-surface-container-highest`는 라이트 전용 `#ffffff`, `--color-surface-bright`는 라이트 `#f0eded`/다크 `#393939`). 교체: `bg-surface-container-highest/60 dark:bg-surface-bright/40` — 값을 새로 만드는 것이 아니라 이미 문서화된 값을 그대로 적용한다.

**`detail-aqi-card.tsx` / `detail-uv-card.tsx`** (모달 배경 스크림, `bg-black/40`) — 결정 2에 따라 `--color-scrim`을 신설한다. **제안 값**(구현 전 Ori 확정 필요 — `docs/Design.md`가 순수 `#000000`을 금지하지만 스크림용으로 문서화된 값은 없음): 이미 문서화된 팔레트 중 가장 어두운 값인 다크 모드 `background`(`#131313`)를 테마에 따라 반전되지 않는 고정 토큰으로 재사용한다 — `--color-scrim: #131313`을 `@theme {}`와 `.dark {}` 양쪽에 동일하게 추가하고, 기존 `/40` 불투명도를 유지해 시각적 무게를 바꾸지 않는다. 새 hex를 발명하지 않으면서 금지된 순수 검정도 피한다. 이 특정 값은 구현 직전 최종 확인이 필요하다.

### `--color-scrim` 토큰 신설 — 전체 체크리스트

`docs/skills/design-tokens.md`의 토큰 추가 절차를 그대로 따른다.

1. `tokens.css`의 `@theme {}`에 `--color-scrim: #131313;`을 주석과 함께 추가한다.
2. `.dark {}`에 동일한 값을 추가한다(스크림은 테마에 따라 반전되지 않는다).
3. `tests/design-tokens.e2e.ts`의 두 describe 블록(Haet-Ssal, Dal-Bit Night) 모두에 `--color-scrim` 검증을 추가한다.
4. `detail-aqi-card.tsx`/`detail-uv-card.tsx`를 `bg-scrim/40`으로 교체한다.
5. `docs/skills/design-tokens.md`의 토큰 참조 표에 추가한다.
6. `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line`을 실행해 확인한다.

## 오류 처리

이 작업은 새로운 런타임 오류 경로를 추가하지 않는다 — 문구와 색상 유틸리티 클래스 교체가 전부다. 유일한 "정지 조건"은 구현 시점의 것이다: `--color-scrim`의 제안 값(`#131313`)이 확정되지 않은 채로는 `tokens.css`에 쓰지 않는다(`docs/skills/design-tokens.md`의 "Stop and ask Ori" 규칙). MD3 미정의 토큰 9개는 이 PR에서 건드리지 않으므로 그로 인한 무배경 버튼·펄스 점은 이 PR 이후에도 남아 있으며, PR 설명에서 명시적으로 언급해 침묵하지 않는다.

## 테스트 전략

- `tests/home-page.test.tsx`의 두 assertion을 새 한국어 문구로 갱신한다: `'Settings Update Needed'` → `'설정 업데이트가 필요합니다'`, `/Retry Connection/` → `/다시 시도/`. 테스트 이름(한국어이지만 영문 문구를 인용)도 함께 갱신한다.
- 나머지 테스트 파일(`app-providers.test.tsx`, `search-page.test.tsx`, `*.e2e.ts`, `detail-dashboard.test.tsx`, `design-tokens.e2e.ts`)은 7개 문구 중 어느 것도 단언하지 않음을 직접 검색으로 확인했다 — 변경 불필요.
- `--color-scrim` 신설에 대한 새 Playwright assertion을 §"토큰 신설" 절차대로 추가한다.
- 자동 검사만으로는 부족하다 — PR #86이 지적했듯 lint·typecheck·유닛·E2E가 모두 통과한 상태에서도 4건의 실결함이 배포됐다(빌드 산출물을 직접 열거나 서버를 띄워야만 보였다). 개발 서버로 두 오류 상태(config-error, recoverable-error), `/search`, detail 페이지 AQI/UV 모달, 전역 ErrorBoundary를 라이트·다크 각각에서 직접 확인한다.

## 비범위

- 도달 불가 영문 문구 3곳(Open Settings/Try Again/Go to Saved Places) — 결정 3에 따라 그대로 둔다.
- MD3 미정의 토큰 9개 — 결정 1에 따라 후속 이슈로 분리한다.
- `docs/journal/journal-2026-07-28-status-review.md`의 옛 영문 문구 인용 — PR #86의 병합 결과인 시점 기록이므로 그대로 둔다.
- JSX 텍스트 노드 파싱 lint 규칙(재발 방지 수단) — 후속 이슈로 분리하고 한 문단 스케치만 남긴다: `JSXText` 노드를 방문해 비한국어·비기술 문구를 잡아내고 오류 코드 같은 알려진 기술 토큰은 허용 목록으로 제외하는 커스텀 ESLint 규칙.
- 죽은 컴포넌트 제거(`placeholder-page`, `home-not-found`, `home-unsupported`) — 이슈 #82.
- `/settings` 구현 — 이슈 #77(이미 완료).
- 다국어(i18n) 도입.
- 디자인 토큰 체계 자체 변경.
