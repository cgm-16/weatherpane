import { test as base, expect, type ConsoleMessage } from '@playwright/test';

// React 하이드레이션 불일치를 알리는 문구는 버전에 따라 형태가 다르지만
// ("Hydration failed because...", "A tree hydrated but some attributes...",
// "Text content did not match" 등) 공통적으로 "hydrat"를 포함한다.
// 이 하나의 패턴으로 하이드레이션 관련 경고를 모두 포착하면서,
// HMR 로그나 React DevTools 안내 같은 무관한 콘솔 노이즈는 건드리지 않는다.
const HYDRATION_WARNING_PATTERN = /hydrat/i;

// React의 하이드레이션 오류 메시지는 원인 설명과 컴포넌트 트리 스냅샷까지 포함해
// 수십 줄에 달한다. 실패 요약에는 첫 줄만 남겨, 여러 건이 동시에 잡혀도 한눈에
// 구분할 수 있게 한다. 전체 스택은 Playwright trace/webServer stdout에 그대로 남는다.
function firstLine(text: string): string {
  return text.split('\n', 1)[0];
}

// 모든 *.e2e.ts는 '@playwright/test' 대신 이 파일에서 test/expect를 가져와야 한다.
// page fixture를 재정의해 콘솔 에러/경고와 페이지 에러 중 하이드레이션 관련 문구를
// 수집하고, 테스트 종료 시 비어 있는지 단언한다. React 19는 SSR/클라이언트 초기 렌더가
// 어긋나면 이를 pageerror(dev 모드에서 uncaught error)로 던지므로 두 채널을 모두 감시한다.
//
// knownHydrationBug: 이미 이슈로 등록된 기존 하이드레이션 버그를 일시적으로 눈감아주는
// 옵션 fixture다. `test.use({ knownHydrationBug: '#91' })`처럼 이슈 번호를 선언한 스펙/
// describe 블록에서만 가드가 실패 대신 통과를 허용한다. 하이드레이션 불일치는 환경에 따라
// 재현 여부가 갈리는 비결정적 현상이라(로컬에서는 재현되지만 CI에서는 재현되지 않는 경우가
// 실제로 있었다), 웨이버가 선언된 실행에서 문제가 감지되지 않았다고 해서 테스트를 실패시키지
// 않는다 — 비결정적 조건을 강제 실패로 바꾸는 셈이 되기 때문이다. 대신 통과시키되, 이슈가
// 실제로 해결되어 웨이버가 더 이상 필요 없어졌을 가능성을 놓치지 않도록 눈에 띄는 경고를
// 남긴다. 즉 이 웨이버는 자기 자신을 문서화할 뿐(best-effort) 스스로 강제하지는 않는다
// (not self-enforcing) — 실제로 이슈가 해결됐는지는 사람이 확인해서 웨이버를 지워야 한다.
export const test = base.extend<{ knownHydrationBug: string | null }>({
  knownHydrationBug: [null, { option: true }],
  // 매개변수명을 runWithFixture로 둔다: Playwright는 위치로 콜백을 넘기므로 이름은
  // 자유롭지만, 통상적인 이름 `use`는 React 19의 `use()` 훅과 동일한 식별자라
  // eslint-react의 rules-of-hooks가 오탐한다.
  page: async ({ page, knownHydrationBug }, runWithFixture) => {
    const hydrationIssues: string[] = [];

    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return;
      if (HYDRATION_WARNING_PATTERN.test(message.text())) {
        hydrationIssues.push(
          `[console.${message.type()}] ${firstLine(message.text())}`
        );
      }
    };
    const onPageError = (error: Error) => {
      if (HYDRATION_WARNING_PATTERN.test(error.message)) {
        hydrationIssues.push(`[pageerror] ${firstLine(error.message)}`);
      }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    await runWithFixture(page);

    if (knownHydrationBug) {
      if (hydrationIssues.length > 0) {
        // 눈감아준 하이드레이션 문제를 webServer 로그를 뒤지지 않고도 테스트 출력에서
        // 바로 확인할 수 있도록 한 줄로 남긴다. 동일한 메시지가 여러 번 잡히는 경우가
        // 흔하므로(예: 같은 하이드레이션 오류가 pageerror와 console 양쪽에 찍힘) 중복은
        // 제거해 신호 대 잡음비를 유지한다.
        console.log(
          `[knownHydrationBug ${knownHydrationBug}] ${[...new Set(hydrationIssues)].join(' | ')}`
        );
      } else {
        // 이번 실행에서는 아무 것도 감지되지 않았다 — 버그가 고쳐졌을 수도, 그저
        // 이번 실행에서 재현되지 않았을 뿐일 수도 있다. 어느 쪽인지 테스트 하나로는
        // 판별할 수 없으므로 실패시키지 않고, 사람이 확인해서 지울 수 있도록 grep하기
        // 쉬운 접두사를 단 경고만 남긴다.
        console.warn(
          `[STALE_HYDRATION_WAIVER] knownHydrationBug: ${knownHydrationBug}로 웨이버가 ` +
            `선언되어 있지만 이번 실행에서는 하이드레이션 관련 경고/에러가 감지되지 ` +
            `않았습니다. ${knownHydrationBug} 이슈가 해결되었을 수 있으니 재현 여부를 ` +
            `확인하고, 해결되었다면 test.use({ knownHydrationBug }) 웨이버를 제거하고 ` +
            `해당 이슈를 닫아주세요.`
        );
      }
    } else {
      expect(
        hydrationIssues,
        `하이드레이션 관련 경고/에러 ${hydrationIssues.length}건 감지:\n${hydrationIssues.join('\n')}`
      ).toEqual([]);
    }
  },
});

export { expect };
