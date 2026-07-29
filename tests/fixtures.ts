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
export const test = base.extend({
  // 매개변수명을 runWithFixture로 둔다: Playwright는 위치로 콜백을 넘기므로 이름은
  // 자유롭지만, 통상적인 이름 `use`는 React 19의 `use()` 훅과 동일한 식별자라
  // eslint-react의 rules-of-hooks가 오탐한다.
  page: async ({ page }, runWithFixture) => {
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

    expect(
      hydrationIssues,
      `하이드레이션 관련 경고/에러 ${hydrationIssues.length}건 감지:\n${hydrationIssues.join('\n')}`
    ).toEqual([]);
  },
});

export { expect };
