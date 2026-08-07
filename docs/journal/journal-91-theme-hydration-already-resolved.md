# #91 테마 SSR 하이드레이션 불일치 — 이미 해결됨 확인

- 날짜: 2026-08-07
- 이슈: #91 `fix(theme): 테마 초기값을 클라이언트에서만 읽어 SSR 하이드레이션 불일치`
- 결론: 이슈가 요구한 두 작업 모두 `main`에 이미 반영되어 있어, **신규 코드 수정 없이 검증 후 종료**한다.

## 이슈가 요구한 것

1. `use-theme.tsx`의 초기 상태 계산을 `useSyncExternalStore` + `getServerSnapshot`로 SSR 안전하게 변경.
2. #74에서 `theme-smoke` / `design-tokens` 스펙에 걸어둔 하이드레이션 가드 웨이버 제거.

## 조사 결과 — 두 작업 모두 이미 완료

- **웨이버 제거 완료.** `21336cd`가 두 스펙에 `#91` 웨이버(서명 `data-theme-toggle|dark_mode` — 구
  테마 토글 버튼 서브트리의 서버/클라이언트 렌더 차이)를 추가했고, `0c704bc`가 이를 정제했다.
  이후 **`552373c`가 두 웨이버를 모두 제거**했다(토글 버튼을 설정 화면 라디오로 교체하면서 해당
  서명이 더 이상 재현되지 않음). 현재 어떤 스펙도 `#91` 웨이버를 사용하지 않는다(남은 웨이버는
  `settings.e2e.ts` / `favorites-page.e2e.ts`의 `#92`뿐).
- **불일치 자체도 이미 해결.** 근본 해결 커밋 세 개가 모두 `main`의 조상이다: `552373c`(불일치를
  일으키던 토글 서브트리 제거), `d5e5b4c`(`app/root.tsx`의 `<html>`에 `suppressHydrationWarning`),
  `7a6ef18`(`useLayoutEffect` 기반 지연 스토리지 읽기).
- 현재 훅 `frontend/features/settings/model/theme-context.tsx`는 서버·클라이언트 첫 렌더에서 동일한
  기본값(`'system'` / `'light'`)을 렌더하므로, 스토리지를 `useLayoutEffect`에서만(클라이언트 전용)
  읽더라도 하이드레이션 불일치가 발생하지 않는다.
- 이슈가 지목한 경로 `frontend/shared/hooks/use-theme.tsx`는 `main` 트리에 존재하지 않는다.

## `useSyncExternalStore` 리팩터를 하지 않은 이유

- **하이드레이션 중립적이다.** `getServerSnapshot()`은 `'light'`를 반환할 텐데, 이는 현재
  `useState('light')`이 서버·클라이언트 첫 렌더에서 이미 렌더하는 값과 동일하다. 런타임 동작을
  전혀 바꾸지 않으며 살아있는 버그를 고치지도 않는다.
- **관용구가 맞지 않는다.** `useSyncExternalStore`는 읽기 전용 외부 소스에 적합하다(그래서
  `use-online-status.ts`가 `navigator.onLine`에 사용). 테마 프로바이더는 상태를 가지며
  상호작용한다(`setPreference` 쓰기, 파생 `theme`, `matchMedia` 리스너). 이 부류에 대한 저장소의
  채택된 패턴은 `active-location-context.tsx`(#93)의 `useState` 기본값 + 이펙트 + `hydrated` 플래그
  형태이며, 현재 훅은 이미 이 패턴을 따르고 있다.

## 검증 (근거)

- E2E (가드 강제, `#91` 웨이버 없음): `pnpm exec playwright test tests/theme-smoke.e2e.ts tests/design-tokens.e2e.ts`
  → **16 passed (5.1s)**. `/hydrat/i` 콘솔/pageerror 미발생 = 가드 통과.
- 테마 단위 테스트: `pnpm exec vitest run tests/theme-behavior.test.tsx tests/theme-init-script.test.tsx tests/storage/theme-repository.test.ts`
  → **3 files, 10 passed**.
- 테마 앱 소스는 `main` 대비 변경 없음(이미 CI 통과 상태) → 프로젝트 전역 lint/typecheck 별도 실행 불필요.

## 참고

- 억제 장치는 위치가 아니라 결함 서명에 건다는 원칙(`dd6b24f`, `docs/skills/testing-and-mocks.md`)에
  따라, 웨이버는 결함이 사라지면 자동으로 stale 경고가 된다. `#91` 서명이 사라졌으므로 웨이버 제거가
  올바른 후속 조치였고 이미 반영되어 있다.
