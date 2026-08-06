# Issue 88 UI Copy & Token Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7 English-copy locations identified in issue 88 that sit on actually-rendered screens with Korean, and replace raw Tailwind colors in 4 files with design tokens.

**Architecture:** No new components or abstractions — make minimal changes to the 7 production files (plus 3 test files and 1 doc file, 11 unique paths total) listed in Tasks 1-6. Copy replacements follow the existing screen tone; color replacements either reuse values already documented in `docs/Design.md` (the glassmorphism section) or introduce the new token (`--color-scrim`) Ori confirmed.

**Tech Stack:** React Router v7, Tailwind v4 CSS-first `@theme`, Vitest + Testing Library, Playwright.

## Global Constraints

- UI copy in source files must be Korean (`AGENTS.md`).
- Colors must always go through semantic tokens. No hardcoded hex; use only Tailwind utilities like `bg-primary`/`text-foreground` or `var(--token-name)` (`docs/skills/design-tokens.md`).
- New tokens are defined only in `tokens.css`. If the `@theme {}` (light) and `.dark {}` (dark) values differ, update both. Add a light-mode and dark-mode assertion each to `tests/design-tokens.e2e.ts`.
- Token names follow shadcn kebab-case (`--color-*`, `--radius-*`, `--font-*`, `--shadow-*`).
- Do not invent undocumented color values — stop without `docs/Design.md` backing or Ori's confirmation.
- Commit messages use Conventional Commits + Korean. `docs/agents/*` and `docs/skills/*` files are exempt and use English commit messages.
- Ori confirmed the `--color-scrim` value as `#131313` (same in light and dark, no inversion) — use this value as-is.
- Out of scope for this issue: the 9 undefined MD3 tokens (follow-up issue), the 3 unreachable English strings (Open Settings/Try Again/Go to Saved Places — left as-is), the JSX-text-node lint rule (follow-up issue), the `/settings` implementation (#77, already done), dead-component removal (#82), and i18n adoption.

---

### Task 1: home-config-error.tsx — Copy and Glass-Card Token Replacement

**Files:**

- Modify: `frontend/pages/home/ui/home-config-error.tsx` (original lines: 1-2 imports, 13 glass-card div, 25 heading, 29-30 body)
- Test: `tests/home-page.test.tsx:93,104`

**Interfaces:**

- Consumes: `GlassContainer` from `frontend/shared/ui/glass-container.tsx` — `{ children: React.ReactNode; className?: string }`, an existing shared component; do not create a new one.
- Produces: the new heading text `'설정 업데이트가 필요합니다'` that the `config-error` test in `home-page.test.tsx` references — re-verified during Task 8's full validation.

- [ ] **Step 1: Update to a failing test**

Replace `tests/home-page.test.tsx:93-106` with the following:

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

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run tests/home-page.test.tsx -t "설정 업데이트가 필요합니다"`
Expected: FAIL — the component still renders `'Settings Update Needed'`.

- [ ] **Step 3: Modify the component**

`frontend/shared/ui/glass-container.tsx` already has a shared `GlassContainer` component implementing exactly this pattern (`bg-surface-container-highest/60 backdrop-blur-[20px] dark:bg-surface-bright/40`). Reuse this component instead of duplicating the same class string.

Add to the imports at `frontend/pages/home/ui/home-config-error.tsx:1-2`:

```tsx
// 설정 오류 화면입니다. API 키 또는 제공자 모드가 잘못 설정된 경우 표시됩니다.
import type { ConfigError } from '~/shared/lib/env-config';
import { GlassContainer } from '~/shared/ui/glass-container';
```

Replace `frontend/pages/home/ui/home-config-error.tsx:13`:

```tsx
      <GlassContainer className="w-full max-w-md rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
```

Also replace this div's matching closing tag (the `</div>` right before `<main>`, original line 65) with `</GlassContainer>`.

Find and replace original line 25 (`Settings Update Needed`):

```tsx
          설정 업데이트가 필요합니다
```

Find and replace original lines 29-30 (`Your travel concierge needs a quick adjustment. It looks like an API key or location`/`setting is missing.`):

```tsx
          API 키 또는 위치 설정이 누락된 것 같습니다. 설정을 확인해 주세요.
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run tests/home-page.test.tsx`
Expected: PASS (whole file)

- [ ] **Step 5: Commit**

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

### Task 2: home-connection-error.tsx — Copy Replacement

**Files:**

- Modify: `frontend/pages/home/ui/home-connection-error.tsx:41,44,54,69`
- Test: `tests/home-page.test.tsx:108,115`

**Interfaces:**

- Consumes: none
- Produces: the new button text `'다시 시도'` that the `recoverable-error` test in `home-page.test.tsx` references.

- [ ] **Step 1: Update to a failing test**

Replace `tests/home-page.test.tsx:108-117` with the following:

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

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run tests/home-page.test.tsx -t "다시 시도 버튼을 표시한다"`
Expected: FAIL — the component still renders `'Retry Connection'`.

- [ ] **Step 3: Modify the component**

Replace `frontend/pages/home/ui/home-connection-error.tsx:41`:

```tsx
          연결이 끊겼습니다
```

Replace `frontend/pages/home/ui/home-connection-error.tsx:44`:

```tsx
          날씨 정보를 불러오지 못했습니다. 신호 상태를 확인한 후 다시 시도해 주세요.
```

Replace `frontend/pages/home/ui/home-connection-error.tsx:54`:

```tsx
            다시 시도
```

Replace `frontend/pages/home/ui/home-connection-error.tsx:69`:

```tsx
          오류 코드: CONNECTION_FAILED
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run tests/home-page.test.tsx`
Expected: PASS (whole file)

- [ ] **Step 5: Commit**

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

### Task 3: search-page.tsx — Eyebrow Label Replacement

**Files:**

- Modify: `frontend/pages/search/ui/search-page.tsx:306`
- Test: `tests/search-page.test.tsx` (new test added)

**Interfaces:**

- Consumes: none
- Produces: none (no other task depends on this text)

- [ ] **Step 1: Write a failing test**

Add a new test inside the `describe('search default state — recents and popular', ...)` block (around line 550) in `tests/search-page.test.tsx`:

```tsx
test('shows the 대한민국 지역 검색 eyebrow label', async () => {
  renderSearchRoute();

  expect(await screen.findByText('대한민국 지역 검색')).toBeVisible();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run tests/search-page.test.tsx -t "대한민국 지역 검색"`
Expected: FAIL — the component renders `'Korea catalog search'`.

- [ ] **Step 3: Modify the component**

Replace `frontend/pages/search/ui/search-page.tsx:306`:

```tsx
                대한민국 지역 검색
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run tests/search-page.test.tsx`
Expected: PASS (whole file)

- [ ] **Step 5: Commit**

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

### Task 4: app/root.tsx — ErrorBoundary Token Replacement

**Files:**

- Modify: `app/root.tsx:110-117`

**Interfaces:**

- Consumes: `--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-card`, `--color-card-foreground` (all already present in `tokens.css`)
- Produces: none

This component has no corresponding unit test (it's the global React Router `ErrorBoundary`, which only renders when an error is thrown). Verify it during Task 8's manual visual check.

- [ ] **Step 1: Check the current code**

Current state of `app/root.tsx:108-121`:

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

This `<main>` inherits its background via `body { @apply bg-background text-foreground antialiased; }` in `global.css:45`. In light mode, `background` is `#fcf9f8` (near-white), so the current `text-white`/`text-sky-300`/`text-slate-300` is a genuine low-contrast defect.

- [ ] **Step 2: Replace with tokens**

Replace `app/root.tsx:108-121` with the following:

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

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors

- [ ] **Step 4: Manual check (dev server)**

Run: `pnpm dev`

In the browser, navigate to a nonexistent route (e.g. `/does-not-exist-xyz`) to confirm the `ErrorBoundary` renders. Capture screenshots in both light and dark mode confirming the text contrasts with the background.

- [ ] **Step 5: Commit**

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

### Task 5: Introduce the `--color-scrim` Token

**Files:**

- Modify: `frontend/app/styles/tokens.css:74,122`
- Modify: `tests/design-tokens.e2e.ts:86-92,162-167`
- Modify: `docs/skills/design-tokens.md` (Token reference table)

**Interfaces:**

- Consumes: none
- Produces: the Tailwind utility `bg-scrim` (usable with any opacity suffix, e.g. `bg-scrim/40`) — consumed by Task 6.

- [ ] **Step 1: Write a failing Playwright test**

Replace `tests/design-tokens.e2e.ts:86-92` (the light-mode `'tertiary 및 glassmorphism 토큰이 정의된다'` test) with the following:

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

Replace `tests/design-tokens.e2e.ts:162-167` (the dark-mode `'어두운 모드 tertiary 및 glassmorphism 토큰이 정의된다'` test) with the following:

```tsx
test('어두운 모드 tertiary 및 glassmorphism 토큰이 정의된다', async ({
  page,
}) => {
  expect(await getCssVar(page, '--color-tertiary')).toBe('#62dca3');
  expect(await getCssVar(page, '--color-surface-bright')).toBe('#393939');
  expect(await getCssVar(page, '--color-scrim')).toBe('#131313');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line`
Expected: FAIL — `--color-scrim` isn't defined yet, so it returns an empty string.

- [ ] **Step 3: Add the token definition**

Replace `frontend/app/styles/tokens.css:72-75` (the glassmorphism section of the light `@theme {}` block) with the following:

```css
  /* 유리형태 기반 색상 */
  --color-surface-container-highest: #ffffff; /* 밝은 모드 glass base */
  --color-surface-bright: #f0eded; /* light fallback (unused) */
  --color-scrim: #131313; /* 모달 배경 스크림 — 테마 반전 없이 고정, 다크 모드 background 값 재사용 */
}
```

Replace `frontend/app/styles/tokens.css:121-123` (the glassmorphism section of the dark `.dark {}` block) with the following:

```css
/* 유리형태 기반 색상 */
--color-surface-bright: #393939; /* surface_bright */
--color-scrim: #131313; /* 모달 배경 스크림 — 라이트 모드와 동일, 테마 반전 없음 */
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line`
Expected: PASS (whole file)

- [ ] **Step 5: Update the skill doc**

Add a new row right after the `surface-bright` row in the Token reference table in `docs/skills/design-tokens.md`:

```markdown
| `scrim` | `#131313` | (same) | Modal backdrop dimming — fixed, does not invert |
```

- [ ] **Step 6: Commit**

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

### Task 6: Apply the Scrim Token to Detail-Card Modals

**Files:**

- Modify: `frontend/pages/location/ui/detail-aqi-card.tsx:74`
- Modify: `frontend/pages/location/ui/detail-uv-card.tsx:61`

**Interfaces:**

- Consumes: the `bg-scrim` utility produced by Task 5
- Produces: none

Both components render on the normal detail screen every day (not an error screen) — the "renders daily" risk the issue calls out. The existing `tests/detail-dashboard.test.tsx` tests modal open/close via `role="dialog"` but doesn't assert on the background-color class, so the existing test should keep passing unchanged.

- [ ] **Step 1: Confirm the existing test passes first (baseline)**

Run: `pnpm exec vitest run tests/detail-dashboard.test.tsx`
Expected: PASS (pre-change baseline)

- [ ] **Step 2: Modify the components**

Replace `frontend/pages/location/ui/detail-aqi-card.tsx:73-76`:

```tsx
<div className="absolute inset-0 bg-scrim/40" onClick={() => setOpen(false)} />
```

Replace `frontend/pages/location/ui/detail-uv-card.tsx:60-63`:

```tsx
<div className="absolute inset-0 bg-scrim/40" onClick={() => setOpen(false)} />
```

- [ ] **Step 3: Run the test and confirm it still passes**

Run: `pnpm exec vitest run tests/detail-dashboard.test.tsx`
Expected: PASS — modal open/close behavior is unchanged.

- [ ] **Step 4: Manual check (dev server)**

Run: `pnpm dev`

On the detail page, open the AQI and UV cards' "상세 보기" each and confirm the backdrop dims naturally in both light and dark mode.

- [ ] **Step 5: Commit**

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

### Task 7: File the 2 Follow-Up Issues

**Files:** none (GitHub issues only)

**Interfaces:** none

- [ ] **Step 1: File the MD3-undefined-tokens gap issue**

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

Done-check: an issue number is created and shown in the output.

- [ ] **Step 2: File the JSX-text-node lint-rule issue**

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

Done-check: an issue number is created and shown in the output.

- [ ] **Step 3: Add a cross-reference comment on issue 88 for the follow-up issues**

Run (substitute `<N>` with the actual issue numbers from Steps 1-2):

```bash
gh issue comment 88 --repo cgm-16/weatherpane --body "$(cat <<'EOF'
구현 중 발견한 후속 이슈 2건을 분리해 등록했다.

- MD3 미정의 토큰 9개 (home-config-error.tsx/home-connection-error.tsx): #<N>
- JSX 텍스트 노드 파싱 lint 규칙 (재발 방지): #<N>

두 항목 모두 이슈 88 범위 밖으로 판단해 이번 PR에 포함하지 않았다.
EOF
)"
```

Done-check: the comment appears on issue 88.

This task makes no code changes, so there's nothing to commit.

---

### Task 8: Full Validation and PR Prep

**Files:** none (validation only)

**Interfaces:** none

- [ ] **Step 1: Static checks**

Run: `pnpm lint && pnpm typecheck`
Expected: no errors

- [ ] **Step 2: Unit tests**

Run: `pnpm exec vitest run`
Expected: all pass (606 baseline + 1 added in Task 3)

- [ ] **Step 3: Playwright smoke**

Run: `pnpm exec playwright test tests/design-tokens.e2e.ts tests/home-page.e2e.ts tests/search-page.e2e.ts --reporter=line`
Expected: all pass

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 5: Manual visual verification**

Run: `pnpm dev`

Confirm the following in both light and dark mode, and capture screenshots:

- the config-error state (reproduce by temporarily clearing an env var, or render `HomeConfigError` directly via Storybook/a temporary route)
- the recoverable-error state (`HomeConnectionError`)
- the `/search` page eyebrow label
- the detail page's AQI/UV card modals
- the global `ErrorBoundary`, by navigating to a nonexistent route

- [ ] **Step 6: `git diff --check`**

Run: `git diff --check main...HEAD`
Expected: no whitespace errors

- [ ] **Step 7: Create the PR**

Open the PR using `.github/PULL_REQUEST_TEMPLATE.md`. Include:

- a link to issue 88 (`Closes #88`)
- in-scope/out-of-scope (quote the spec doc's "비범위" section verbatim)
- links to the 2 follow-up issues filed in Task 7
- spec alignment: link to `docs/superpowers/specs/2026-08-06-issue-88-ui-copy-token-cleanup-design.md`
- the list of tests run (the exact commands from Steps 1-4)
- screenshots (Step 5)
- rollback notes: purely revertible, no data/schema impact

```bash
gh pr create --repo cgm-16/weatherpane --base main \
  --title "fix(theme): 살아 있는 오류·빈 상태 화면 영문 문구 및 raw Tailwind 색상 정리"
```

Done-check: the PR is created and links issue 88.

---

## Task Ordering Summary

Tasks 1-4 are independent of each other and can run in parallel. Task 5 is independent of Tasks 1-4. **Task 6 runs only after Task 5 completes** (it depends on the `bg-scrim` utility). Task 7 runs after Tasks 1-6 complete, reflecting whatever was discovered along the way. Task 8 always runs last.
