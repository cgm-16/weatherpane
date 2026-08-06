# 이슈 88 UI 문구·토큰 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 88에서 확인된, 실제로 렌더링되는 화면의 영문 문구 7곳을 한국어로 교체하고 raw Tailwind 색상 4개 파일을 디자인 토큰으로 교체한다.

**Architecture:** 새 컴포넌트나 추상화 없이 지정된 8개 파일만 최소 변경한다. 문구 교체는 기존 화면 톤에 맞추고, 색상 교체는 `docs/Design.md`에 이미 문서화된 값(유리형태 절)을 그대로 적용하거나 Ori가 확정한 새 토큰(`--color-scrim`)을 신설한다.

**Tech Stack:** React Router v7, Tailwind v4 CSS-first `@theme`, Vitest + Testing Library, Playwright.

## Global Constraints

- 소스 파일의 UI 문구는 한국어여야 한다 (`AGENTS.md`).
- 색상은 항상 시맨틱 토큰을 경유해야 한다. hardcoded hex 금지, `bg-primary`/`text-foreground` 같은 Tailwind 유틸리티 또는 `var(--token-name)`만 사용한다 (`docs/skills/design-tokens.md`).
- 새 토큰은 `tokens.css`에만 정의한다. `@theme {}`(라이트)와 `.dark {}`(다크) 값이 다르면 둘 다 갱신한다. `tests/design-tokens.e2e.ts`에 라이트·다크 각각 assertion을 추가한다.
- 토큰 이름은 shadcn kebab-case (`--color-*`, `--radius-*`, `--font-*`, `--shadow-*`)를 따른다.
- 문서화되지 않은 색상 값을 발명하지 않는다 — `docs/Design.md` 또는 Ori 확인 없이는 정지한다.
- 커밋 메시지는 Conventional Commits + 한국어. `docs/agents/*`, `docs/skills/*` 파일은 영문 커밋 메시지 예외.
- `--color-scrim` 값은 Ori가 `#131313`(라이트·다크 동일, 반전 없음)로 확정했다 — 이 값을 그대로 사용한다.
- 이 이슈 범위 밖: MD3 미정의 토큰 9개(후속 이슈), 도달 불가 영문 문구 3곳(Open Settings/Try Again/Go to Saved Places, 그대로 둠), JSX 텍스트 노드 lint 규칙(후속 이슈), `/settings` 구현(#77, 완료됨), 죽은 컴포넌트 제거(#82), i18n 도입.

---

### Task 1: home-config-error.tsx — 문구 및 유리 카드 토큰 교체

**Files:**

- Modify: `frontend/pages/home/ui/home-config-error.tsx` (원본 기준 1-2번 import, 13번 유리 카드 div, 25번 제목, 29-30번 본문)
- Test: `tests/home-page.test.tsx:93,104`

**Interfaces:**

- Consumes: `GlassContainer` from `frontend/shared/ui/glass-container.tsx` — `{ children: React.ReactNode; className?: string }`, 이미 존재하는 공유 컴포넌트, 새로 만들지 않는다.
- Produces: `home-page.test.tsx`의 `config-error` 테스트가 참조하는 새 헤딩 텍스트 `'설정 업데이트가 필요합니다'` — Task 8의 전체 검증에서 재확인한다.

- [ ] **Step 1: 실패하는 테스트로 갱신**

`tests/home-page.test.tsx:93-106`을 다음으로 교체한다:

```tsx
test('config-error → 설정 업데이트가 필요합니다 제목을 표시한다', () => {
  vi.mocked(useHomeBootstrap).mockReturnValue({
    kind: 'config-error',
    error: {
      code: 'INVALID_PROVIDER_MODE',
      field: 'VITE_WEATHER_PROVIDER_MODE',
      message: '값이 설정되지 않았습니다',
    },
  });
  renderPage();
  expect(
    screen.getByRole('heading', { name: '설정 업데이트가 필요합니다' })
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `pnpm exec vitest run tests/home-page.test.tsx -t "설정 업데이트가 필요합니다"`
Expected: FAIL — 현재 컴포넌트는 여전히 `'Settings Update Needed'`를 렌더링한다.

- [ ] **Step 3: 컴포넌트 수정**

`frontend/shared/ui/glass-container.tsx`에 이미 정확히 이 패턴(`bg-surface-container-highest/60 backdrop-blur-[20px] dark:bg-surface-bright/40`)을 구현한 공유 `GlassContainer` 컴포넌트가 있다. 같은 클래스 문자열을 중복 작성하지 않고 이 컴포넌트를 재사용한다.

`frontend/pages/home/ui/home-config-error.tsx:1-2`의 import에 추가한다:

```tsx
// 설정 오류 화면입니다. API 키 또는 제공자 모드가 잘못 설정된 경우 표시됩니다.
import type { ConfigError } from '~/shared/lib/env-config';
import { GlassContainer } from '~/shared/ui/glass-container';
```

`frontend/pages/home/ui/home-config-error.tsx:13`을 교체한다:

```tsx
      <GlassContainer className="w-full max-w-md rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
```

이 div와 짝을 이루는 닫는 태그(`<main>` 바로 앞의 `</div>`, 원본 65번 줄)도 `</GlassContainer>`로 교체한다.

원본 25번 줄(`Settings Update Needed`)을 찾아서 교체한다:

```tsx
          설정 업데이트가 필요합니다
```

원본 29-30번 줄(`Your travel concierge needs a quick adjustment. It looks like an API key or location`/`setting is missing.`)을 찾아서 교체한다:

```tsx
          API 키 또는 위치 설정이 누락된 것 같습니다. 설정을 확인해 주세요.
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `pnpm exec vitest run tests/home-page.test.tsx`
Expected: PASS (전체 파일)

- [ ] **Step 5: 커밋**

```bash
git add frontend/pages/home/ui/home-config-error.tsx tests/home-page.test.tsx
git commit -m "$(cat <<'EOF'
fix(theme): 설정 오류 화면 문구 한국어 교체 및 유리 카드 토큰 적용

home-config-error.tsx의 영문 문구 2곳을 한국어로 교체하고,
bg-white/50 유리 카드를 기존 공유 GlassContainer 컴포넌트로
교체해 docs/Design.md 유리형태 절이 명시한
surface-container-highest/60(라이트)·surface-bright/40(다크)
토큰을 재사용한다.

Closes 일부 #88
EOF
)"
```

---

### Task 2: home-connection-error.tsx — 문구 교체

**Files:**

- Modify: `frontend/pages/home/ui/home-connection-error.tsx:41,44,54,69`
- Test: `tests/home-page.test.tsx:108,115`

**Interfaces:**

- Consumes: 없음
- Produces: `home-page.test.tsx`의 `recoverable-error` 테스트가 참조하는 새 버튼 텍스트 `'다시 시도'`.

- [ ] **Step 1: 실패하는 테스트로 갱신**

`tests/home-page.test.tsx:108-117`을 다음으로 교체한다:

```tsx
test('recoverable-error → 다시 시도 버튼을 표시한다', () => {
  vi.mocked(useHomeBootstrap).mockReturnValue({
    kind: 'recoverable-error',
    location: loc,
  });
  renderPage();
  expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `pnpm exec vitest run tests/home-page.test.tsx -t "다시 시도 버튼을 표시한다"`
Expected: FAIL — 현재 컴포넌트는 여전히 `'Retry Connection'`을 렌더링한다.

- [ ] **Step 3: 컴포넌트 수정**

`frontend/pages/home/ui/home-connection-error.tsx:41`을 교체한다:

```tsx
          연결이 끊겼습니다
```

`frontend/pages/home/ui/home-connection-error.tsx:44`를 교체한다:

```tsx
          날씨 정보를 불러오지 못했습니다. 신호 상태를 확인한 후 다시 시도해 주세요.
```

`frontend/pages/home/ui/home-connection-error.tsx:54`를 교체한다:

```tsx
            다시 시도
```

`frontend/pages/home/ui/home-connection-error.tsx:69`를 교체한다:

```tsx
          오류 코드: CONNECTION_FAILED
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `pnpm exec vitest run tests/home-page.test.tsx`
Expected: PASS (전체 파일)

- [ ] **Step 5: 커밋**

```bash
git add frontend/pages/home/ui/home-connection-error.tsx tests/home-page.test.tsx
git commit -m "$(cat <<'EOF'
fix(theme): 연결 오류 화면 영문 문구 4곳 한국어 교체

Connection Interrupted, 안내 본문, Retry Connection, 오류 코드
라벨을 기존 화면 톤(location-connection-error.tsx, "다시 시도")에
맞춰 한국어로 교체한다.

Closes 일부 #88
EOF
)"
```

---

### Task 3: search-page.tsx — eyebrow 라벨 교체

**Files:**

- Modify: `frontend/pages/search/ui/search-page.tsx:306`
- Test: `tests/search-page.test.tsx` (새 테스트 추가)

**Interfaces:**

- Consumes: 없음
- Produces: 없음 (다른 태스크가 이 텍스트에 의존하지 않음)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/search-page.test.tsx`의 `describe('search default state — recents and popular', ...)` 블록(550번 줄 근처) 안에 새 테스트를 추가한다:

```tsx
test('shows the 대한민국 지역 검색 eyebrow label', async () => {
  renderSearchRoute();

  expect(await screen.findByText('대한민국 지역 검색')).toBeVisible();
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `pnpm exec vitest run tests/search-page.test.tsx -t "대한민국 지역 검색"`
Expected: FAIL — 현재 컴포넌트는 `'Korea catalog search'`를 렌더링한다.

- [ ] **Step 3: 컴포넌트 수정**

`frontend/pages/search/ui/search-page.tsx:306`을 교체한다:

```tsx
                대한민국 지역 검색
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `pnpm exec vitest run tests/search-page.test.tsx`
Expected: PASS (전체 파일)

- [ ] **Step 5: 커밋**

```bash
git add frontend/pages/search/ui/search-page.tsx tests/search-page.test.tsx
git commit -m "$(cat <<'EOF'
fix(theme): 검색 페이지 eyebrow 라벨 한국어 교체

/search의 유일한 영문 문구였던 'Korea catalog search'를
'대한민국 지역 검색'으로 교체하고 회귀 테스트를 추가한다.

Closes 일부 #88
EOF
)"
```

---

### Task 4: app/root.tsx — ErrorBoundary 토큰 교체

**Files:**

- Modify: `app/root.tsx:110-117`

**Interfaces:**

- Consumes: `--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-card`, `--color-card-foreground` (모두 `tokens.css`에 이미 존재)
- Produces: 없음

이 컴포넌트에는 대응하는 유닛 테스트가 없다(전역 React Router `ErrorBoundary`, 에러를 던져야 렌더링됨). Task 8의 수동 시각 검증에서 확인한다.

- [ ] **Step 1: 현재 코드 확인**

`app/root.tsx:108-121`의 현재 상태:

```tsx
return (
  <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
    <p className="text-sm font-medium tracking-[0.3em] text-sky-300 uppercase">
      Weatherpane
    </p>
    <h1 className="text-3xl font-semibold text-white">{message}</h1>
    <p className="text-base text-slate-300">{details}</p>
    {stack && (
      <pre className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
        <code>{stack}</code>
      </pre>
    )}
  </main>
);
```

이 `<main>`은 `global.css:45`의 `body { @apply bg-background text-foreground antialiased; }`를 통해 배경을 상속한다. 라이트 모드에서 `background`는 `#fcf9f8`(거의 흰색)이므로 현재의 `text-white`/`text-sky-300`/`text-slate-300`은 실제 저대비 결함이다.

- [ ] **Step 2: 토큰으로 교체**

`app/root.tsx:108-121`을 다음으로 교체한다:

```tsx
return (
  <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
    <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
      Weatherpane
    </p>
    <h1 className="text-3xl font-semibold text-foreground">{message}</h1>
    <p className="text-base text-muted-foreground">{details}</p>
    {stack && (
      <pre className="w-full overflow-x-auto rounded-2xl border border-border bg-card p-4 text-sm text-card-foreground">
        <code>{stack}</code>
      </pre>
    )}
  </main>
);
```

- [ ] **Step 3: 타입체크와 린트 실행**

Run: `pnpm typecheck && pnpm lint`
Expected: 오류 없음

- [ ] **Step 4: 수동 확인 (dev 서버)**

Run: `pnpm dev`

브라우저에서 존재하지 않는 라우트(예: `/does-not-exist-xyz`)로 이동해 `ErrorBoundary`가 렌더링되는지 확인한다. 라이트·다크 모드 각각에서 텍스트가 배경과 대비되는지 스크린샷으로 남긴다.

- [ ] **Step 5: 커밋**

```bash
git add app/root.tsx
git commit -m "$(cat <<'EOF'
fix(theme): 전역 ErrorBoundary raw Tailwind 색상을 토큰으로 교체

text-sky-300/text-white/text-slate-300/border-slate-800/
bg-slate-950/text-slate-200을 text-muted-foreground/
text-foreground/border-border/bg-card/text-card-foreground로
교체한다. 라이트 모드에서 거의 흰 배경 위에 거의 흰 텍스트가
겹치던 저대비 결함을 함께 해결한다.

Closes 일부 #88
EOF
)"
```

---

### Task 5: `--color-scrim` 토큰 신설

**Files:**

- Modify: `frontend/app/styles/tokens.css:74,122`
- Modify: `tests/design-tokens.e2e.ts:86-92,162-167`
- Modify: `docs/skills/design-tokens.md` (Token reference 표)

**Interfaces:**

- Consumes: 없음
- Produces: Tailwind 유틸리티 `bg-scrim` (모든 opacity 접미사와 함께 사용 가능, 예: `bg-scrim/40`) — Task 6이 소비한다.

- [ ] **Step 1: 실패하는 Playwright 테스트 작성**

`tests/design-tokens.e2e.ts:86-92`(라이트 모드 `'tertiary 및 glassmorphism 토큰이 정의된다'` 테스트)를 다음으로 교체한다:

```tsx
test('tertiary 및 glassmorphism 토큰이 정의된다', async ({ page }) => {
  expect(await getCssVar(page, '--color-tertiary')).toBe('#006a45');
  expect(await getCssVar(page, '--color-surface-container-highest')).toBe(
    '#ffffff'
  );
  expect(await getCssVar(page, '--color-surface-bright')).toBe('#f0eded');
  expect(await getCssVar(page, '--color-scrim')).toBe('#131313');
});
```

`tests/design-tokens.e2e.ts:162-167`(다크 모드 `'어두운 모드 tertiary 및 glassmorphism 토큰이 정의된다'` 테스트)를 다음으로 교체한다:

```tsx
test('어두운 모드 tertiary 및 glassmorphism 토큰이 정의된다', async ({
  page,
}) => {
  expect(await getCssVar(page, '--color-tertiary')).toBe('#62dca3');
  expect(await getCssVar(page, '--color-surface-bright')).toBe('#393939');
  expect(await getCssVar(page, '--color-scrim')).toBe('#131313');
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line`
Expected: FAIL — `--color-scrim`이 아직 정의되지 않아 빈 문자열을 반환한다.

- [ ] **Step 3: 토큰 정의 추가**

`frontend/app/styles/tokens.css:72-75`(라이트 `@theme {}` 블록의 유리형태 절)을 다음으로 교체한다:

```css
  /* 유리형태 기반 색상 */
  --color-surface-container-highest: #ffffff; /* 밝은 모드 glass base */
  --color-surface-bright: #f0eded; /* light fallback (unused) */
  --color-scrim: #131313; /* 모달 배경 스크림 — 테마 반전 없이 고정, 다크 모드 background 값 재사용 */
}
```

`frontend/app/styles/tokens.css:121-123`(다크 `.dark {}` 블록의 유리형태 절)을 다음으로 교체한다:

```css
/* 유리형태 기반 색상 */
--color-surface-bright: #393939; /* surface_bright */
--color-scrim: #131313; /* 모달 배경 스크림 — 라이트 모드와 동일, 테마 반전 없음 */
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line`
Expected: PASS (전체 파일)

- [ ] **Step 5: 스킬 문서 갱신**

`docs/skills/design-tokens.md`의 Token reference 표에서 `surface-bright` 행 바로 뒤에 새 행을 추가한다:

```markdown
| `scrim` | `#131313` | (same) | Modal backdrop dimming — fixed, does not invert |
```

- [ ] **Step 6: 커밋**

```bash
git add frontend/app/styles/tokens.css tests/design-tokens.e2e.ts docs/skills/design-tokens.md
git commit -m "$(cat <<'EOF'
feat(tokens): --color-scrim 토큰 신설

모달 배경 스크림 전용 토큰을 추가한다. 라이트·다크 모드에서
반전 없이 #131313(다크 모드 background 재사용)을 사용해
docs/Design.md의 순수 검정 금지 규칙을 지키면서 새 hex를
발명하지 않는다. Ori가 값을 확정했다.

Closes 일부 #88
EOF
)"
```

---

### Task 6: 상세 카드 모달 스크림 토큰 적용

**Files:**

- Modify: `frontend/pages/location/ui/detail-aqi-card.tsx:74`
- Modify: `frontend/pages/location/ui/detail-uv-card.tsx:61`

**Interfaces:**

- Consumes: Task 5가 생성한 `bg-scrim` 유틸리티
- Produces: 없음

이 두 컴포넌트는 매일 정상 상세 화면에서 렌더링된다(오류 화면이 아님) — 이슈가 지적한 "매일 렌더링되는" 리스크다. 기존 `tests/detail-dashboard.test.tsx`는 모달 열림/닫힘을 `role="dialog"`로 테스트하지만 배경색 클래스는 단언하지 않으므로 기존 테스트는 그대로 통과해야 한다.

- [ ] **Step 1: 기존 테스트가 통과함을 먼저 확인 (베이스라인)**

Run: `pnpm exec vitest run tests/detail-dashboard.test.tsx`
Expected: PASS (변경 전 베이스라인)

- [ ] **Step 2: 컴포넌트 수정**

`frontend/pages/location/ui/detail-aqi-card.tsx:73-76`을 교체한다:

```tsx
<div className="bg-scrim/40 absolute inset-0" onClick={() => setOpen(false)} />
```

`frontend/pages/location/ui/detail-uv-card.tsx:60-63`을 교체한다:

```tsx
<div className="bg-scrim/40 absolute inset-0" onClick={() => setOpen(false)} />
```

- [ ] **Step 3: 테스트 실행해 여전히 통과함을 확인**

Run: `pnpm exec vitest run tests/detail-dashboard.test.tsx`
Expected: PASS — 모달 열림/닫힘 동작은 변경되지 않았다.

- [ ] **Step 4: 수동 확인 (dev 서버)**

Run: `pnpm dev`

detail 페이지에서 AQI·UV 카드의 "상세 보기"를 각각 열어 라이트·다크 모드에서 배경이 자연스럽게 어두워지는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/pages/location/ui/detail-aqi-card.tsx frontend/pages/location/ui/detail-uv-card.tsx
git commit -m "$(cat <<'EOF'
fix(theme): 상세 카드 모달 스크림에 --color-scrim 토큰 적용

detail-aqi-card.tsx와 detail-uv-card.tsx의 bg-black/40을
새로 신설한 bg-scrim/40으로 교체한다. 두 컴포넌트는 오류
화면이 아니라 정상 상세 화면에서 매일 렌더링된다.

Closes #88
EOF
)"
```

---

### Task 7: 후속 이슈 2건 등록

**Files:** 없음 (GitHub 이슈만 생성)

**Interfaces:** 없음

- [ ] **Step 1: MD3 미정의 토큰 갭 이슈 등록**

Run:

```bash
gh issue create \
  --repo cgm-16/weatherpane \
  --title "[Bug] home-config-error/home-connection-error의 MD3 스타일 토큰 9개가 tokens.css에 정의되지 않음" \
  --label "type:bug" \
  --label "area:theme" \
  --body "$(cat <<'EOF'
### Area
theme

### One-line summary
home-config-error.tsx와 home-connection-error.tsx가 참조하는 MD3 스타일 토큰 9개(text-on-surface, text-on-surface-variant, bg-secondary-container, bg-outline-variant, bg-primary-container, text-on-primary, text-on-secondary-fixed, bg-surface-container-high, bg-surface-container-lowest)가 tokens.css 어디에도 정의돼 있지 않다.

### Current behavior
Tailwind v4 @theme 체계에서 미정의 유틸리티는 조용히 아무 CSS도 만들지 않는다. 오프라인 펄스 점(bg-outline-variant)이 채움 없이 렌더링되고, "Try Again" 등 버튼의 배경(bg-secondary-container)과 텍스트(text-on-secondary-fixed)가 스타일 없이 렌더링된다.

### Expected behavior
두 컴포넌트가 참조하는 모든 토큰이 tokens.css의 @theme {}와 .dark {}에 정의돼 있어야 하고, tests/design-tokens.e2e.ts에 라이트·다크 각각 assertion이 있어야 한다.

### Reproduction steps
1. frontend/pages/home/ui/home-connection-error.tsx:14의 bg-outline-variant를 확인한다
2. tokens.css 전체에서 --color-outline-variant를 검색한다 (정의 없음)
3. 개발 서버에서 recoverable-error 상태를 렌더링해 오프라인 배지의 점이 채움 없이 보이는지 확인한다

### Severity
p2 - normal

### Environment
모든 브라우저, main 브랜치, 이슈 88 조사 중 발견

### Logs / screenshots / trace
이슈 88(#88) PR 리뷰 노트 참고 — 조사 상세는 docs/superpowers/specs/2026-08-06-issue-88-ui-copy-token-cleanup-design.md의 "결정 1" 참고

관련: #88
EOF
)"
```

Done-check: 이슈 번호가 생성되고 출력에 표시된다.

- [ ] **Step 2: JSX 텍스트 노드 lint 규칙 이슈 등록**

Run:

```bash
gh issue create \
  --repo cgm-16/weatherpane \
  --title "[Task] JSX 텍스트 노드를 파싱하는 커스텀 ESLint 규칙으로 영문 문구 회귀 방지" \
  --label "type:feature" \
  --label "area:ci" \
  --body "$(cat <<'EOF'
### Area
ci

### Goal
grep/정규식 기반 영문 문구 감사가 이슈 86과 이슈 88에서 두 번 연속 틀렸다 — 처음엔 따옴표 문자열만, 다음엔 구두점·축약형·언더스코어를 배제했다. JSX 텍스트 노드를 파싱하는 커스텀 ESLint 규칙으로 이를 대체한다.

### Spec background
이슈 88 범위(docs/superpowers/specs/2026-08-06-issue-88-ui-copy-token-cleanup-design.md)가 이 재발 방지 수단을 "검토"하도록 요청했으나, 규칙 패키지·RuleTester·flat config 연결이 필요한 별도 하위 프로젝트라 이슈 88에서 분리했다.

### In scope
- JSXText 노드를 방문해 비한국어·비기술 문구를 감지하는 커스텀 ESLint 규칙 작성
- 오류 코드 등 알려진 기술 상수를 허용 목록으로 제외
- eslint.config.ts에 규칙 연결
- 규칙 자체의 RuleTester 테스트

### Out of scope
- 기존 위반 사례 일괄 수정 (발견 시 별도 이슈)
- Husky/lint-staged 통합 (필요성 판단 후 별도 결정)

### Acceptance criteria
- pnpm lint가 새 영문 JSXText를 검출해 실패한다
- 기존 코드베이스에 규칙 적용 시 오탐(false positive)이 없다
- 규칙 자체에 대한 유닛 테스트가 있다

### Dependencies / blockers
없음

### Priority
p3
EOF
)"
```

Done-check: 이슈 번호가 생성되고 출력에 표시된다.

- [ ] **Step 3: 이슈 88 본문에 후속 이슈 교차 참조 코멘트 추가**

Run (Step 1·2에서 받은 실제 이슈 번호로 `<N>`을 치환한다):

```bash
gh issue comment 88 --repo cgm-16/weatherpane --body "$(cat <<'EOF'
구현 중 발견한 후속 이슈 2건을 분리해 등록했다.

- MD3 미정의 토큰 9개 (home-config-error.tsx/home-connection-error.tsx): #<N>
- JSX 텍스트 노드 파싱 lint 규칙 (재발 방지): #<N>

두 항목 모두 이슈 88 범위 밖으로 판단해 이번 PR에 포함하지 않았다.
EOF
)"
```

Done-check: 코멘트가 이슈 88에 표시된다.

이 태스크는 코드 변경이 없으므로 커밋하지 않는다.

---

### Task 8: 전체 검증 및 PR 준비

**Files:** 없음 (검증만)

**Interfaces:** 없음

- [ ] **Step 1: 정적 검사**

Run: `pnpm lint && pnpm typecheck`
Expected: 오류 없음

- [ ] **Step 2: 유닛 테스트**

Run: `pnpm exec vitest run`
Expected: 전체 통과 (베이스라인 606개 + Task 3에서 추가한 1개)

- [ ] **Step 3: Playwright 스모크**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts tests/home-page.e2e.ts tests/search-page.e2e.ts --reporter=line`
Expected: 전체 통과

- [ ] **Step 4: 프로덕션 빌드**

Run: `pnpm build`
Expected: 오류 없음

- [ ] **Step 5: 수동 시각 검증**

Run: `pnpm dev`

다음을 라이트·다크 모드 각각에서 확인하고 스크린샷을 남긴다:

- config-error 상태 (환경변수를 임시로 비워 재현하거나 `HomeConfigError`를 Storybook/임시 라우트로 직접 렌더링)
- recoverable-error 상태 (`HomeConnectionError`)
- `/search` 페이지 eyebrow 라벨
- detail 페이지 AQI·UV 카드 모달
- 존재하지 않는 라우트로 이동해 전역 `ErrorBoundary`

- [ ] **Step 6: `git diff --check`**

Run: `git diff --check main...HEAD`
Expected: 공백 오류 없음

- [ ] **Step 7: PR 생성**

`.github/PULL_REQUEST_TEMPLATE.md`를 사용해 PR을 연다. 다음을 포함한다:

- 이슈 88 링크 (`Closes #88`)
- 범위 내/범위 외 (스펙 문서의 "비범위" 절 그대로 인용)
- Task 7에서 등록한 후속 이슈 2건 링크
- 스펙 정합성: `docs/superpowers/specs/2026-08-06-issue-88-ui-copy-token-cleanup-design.md` 링크
- 실행한 테스트 목록 (Step 1~4의 정확한 명령)
- 스크린샷 (Step 5)
- 롤백 노트: 순수 되돌리기 가능, 데이터/스키마 영향 없음

```bash
gh pr create --repo cgm-16/weatherpane --base main \
  --title "fix(theme): 살아 있는 오류·빈 상태 화면 영문 문구 및 raw Tailwind 색상 정리"
```

Done-check: PR이 생성되고 이슈 88을 링크한다.

---

## 태스크 순서 요약

Task 1~4는 서로 독립적이며 병렬 실행 가능하다. Task 5는 Task 1~4와 독립적이다. **Task 6은 Task 5 완료 후에만 실행한다** (`bg-scrim` 유틸리티에 의존). Task 7은 Task 1~6 완료 후 발견 사항을 반영해 실행한다. Task 8은 항상 마지막이다.
