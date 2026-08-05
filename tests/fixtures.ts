import {
  test as base,
  expect,
  type ConsoleMessage,
  type Request,
} from '@playwright/test';

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

// 웨이버가 선언한 버그의 서명을 식별하는 패턴. RegExp 리터럴 대신 문자열로 받아 워커
// 간 직렬화 문제를 피하고, 픽스처 안에서 new RegExp(...)로 조립한다. React의 하이드레이션
// 오류 메시지는 컴포넌트 트리 diff까지 포함해 매우 길지만, 각 버그마다 diff 안에 고유한
// 서명(예: 특정 data 속성, 핸들러 이름, 화면 문구)이 남으므로 그 서명으로 매칭한다.
type KnownHydrationBug = { issue: string; pattern: string } | null;

type HydrationIssue = {
  // 실패/경고 로그에 쓰는 요약 한 줄. 여러 건이 동시에 잡혀도 한눈에 구분할 수 있도록
  // 첫 줄만 남긴다. 전체 스택은 Playwright trace/webServer stdout에 그대로 남는다.
  label: string;
  // pattern 매칭에 쓰는 전체 메시지. 버그의 서명은 diff 안쪽(첫 줄 이후)에 있는 경우가
  // 대부분이라 label(첫 줄)이 아니라 이 전체 텍스트로 매칭해야 한다.
  fullText: string;
};

// 모든 *.e2e.ts는 '@playwright/test' 대신 이 파일에서 test/expect를 가져와야 한다.
// page fixture를 재정의해 콘솔 에러/경고와 페이지 에러 중 하이드레이션 관련 문구를
// 수집하고, 테스트 종료 시 비어 있는지 단언한다. React 19는 SSR/클라이언트 초기 렌더가
// 어긋나면 이를 pageerror(dev 모드에서 uncaught error)로 던지므로 두 채널을 모두 감시한다.
//
// knownHydrationBug: 이미 이슈로 등록된 기존 하이드레이션 버그를 일시적으로 눈감아주는
// 옵션 fixture다. `test.use({ knownHydrationBug: { issue: '#91', pattern: '...' } })`처럼
// 이슈 번호와 그 버그의 서명 패턴을 선언한 스펙/describe 블록에서만 가드가 실패 대신
// 통과를 허용한다 — 단, 감지된 하이드레이션 문제가 전부 그 패턴에 매칭할 때만이다.
// 패턴에 매칭하지 않는 하이드레이션 문제가 하나라도 감지되면, 그것은 웨이버가 가리키는
// 버그가 아니라 웨이버 범위 안에 숨어든 새로운 회귀이므로 그대로 실패시킨다.
//
// 하이드레이션 불일치는 환경에 따라 재현 여부가 갈리는 비결정적 현상이라(로컬에서는
// 재현되지만 CI에서는 재현되지 않는 경우가 실제로 있었다), 웨이버가 선언된 실행에서
// "아무 것도" 감지되지 않았다고 해서 테스트를 실패시키지는 않는다 — 비결정적 조건을
// 강제 실패로 바꾸는 셈이 되기 때문이다. 대신 통과시키되, 이슈가 실제로 해결되어
// 웨이버가 더 이상 필요 없어졌을 가능성을 놓치지 않도록 눈에 띄는 경고를 남긴다.
// 즉 이 "아무 것도 감지되지 않음" 경로는 자기 자신을 문서화할 뿐(best-effort) 스스로
// 강제하지는 않는다(not self-enforcing) — 실제로 이슈가 해결됐는지는 사람이 확인해서
// 웨이버를 지워야 한다.
export const test = base.extend<{ knownHydrationBug: KnownHydrationBug }>({
  knownHydrationBug: [null, { option: true }],
  // 매개변수명을 runWithFixture로 둔다: Playwright는 위치로 콜백을 넘기므로 이름은
  // 자유롭지만, 통상적인 이름 `use`는 React 19의 `use()` 훅과 동일한 식별자라
  // eslint-react의 rules-of-hooks가 오탐한다.
  page: async ({ page, knownHydrationBug }, runWithFixture) => {
    const hydrationIssues: HydrationIssue[] = [];
    // React Router 7.14의 지연 라우트 탐색(lazy route discovery)은 마운트 시 /__manifest를
    // fetch한다. 같은 테스트 안에서 page.reload()나 page.goto()가 그 요청이 끝나기 전에
    // 실행되면 브라우저가 진행 중이던 fetch를 중단시키고, RR은 이를 콘솔에
    // "Failed to fetch manifest patches" 에러로 남긴다 — 앱의 실제 동작과는 무관한, 테스트
    // 하네스 특유의 경쟁 상태다. 조용히 지나치면 진짜 회귀도 같이 묻힐 수 있으므로 console
    // 에러와 requestfailed 이벤트 양쪽에서 감지해 하드 실패로 바꾼다. *.e2e.ts 스펙 파일들의
    // waitForLoadState('networkidle') 호출은 바로 이 경쟁을 막기 위한 가드다.
    const manifestIssues: string[] = [];

    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== 'error' && message.type() !== 'warning') return;
      if (message.text().startsWith('Failed to fetch manifest patches')) {
        manifestIssues.push(
          `[console.${message.type()}] ${firstLine(message.text())}`
        );
      }
      if (HYDRATION_WARNING_PATTERN.test(message.text())) {
        hydrationIssues.push({
          label: `[console.${message.type()}] ${firstLine(message.text())}`,
          fullText: message.text(),
        });
      }
    };
    const onRequestFailed = (request: Request) => {
      if (new URL(request.url()).pathname !== '/__manifest') return;
      manifestIssues.push(
        `[requestfailed] ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`
      );
    };
    const onPageError = (error: Error) => {
      if (HYDRATION_WARNING_PATTERN.test(error.message)) {
        hydrationIssues.push({
          label: `[pageerror] ${firstLine(error.message)}`,
          fullText: error.message,
        });
      }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);

    await runWithFixture(page);

    expect(
      manifestIssues,
      `React Router 매니페스트 요청 오류 ${manifestIssues.length}건 감지:\n${manifestIssues.join('\n')}`
    ).toEqual([]);

    if (knownHydrationBug) {
      const { issue, pattern } = knownHydrationBug;
      if (hydrationIssues.length > 0) {
        const bugSignature = new RegExp(pattern);
        const unmatched = hydrationIssues.filter(
          (issueFound) => !bugSignature.test(issueFound.fullText)
        );
        if (unmatched.length > 0) {
          // 웨이버가 선언한 패턴과 일치하지 않는 하이드레이션 문제가 섞여 있다 —
          // 웨이버 범위 안에 숨어든 새로운 회귀일 수 있으므로, 알려진 버그로 뭉뚱그려
          // 눈감아주지 않고 실패시켜 미매칭 메시지를 그대로 드러낸다.
          expect(
            unmatched.map((issueFound) => issueFound.label),
            `knownHydrationBug ${issue}(패턴: ${pattern})로 웨이버가 선언되어 있지만, ` +
              `그 패턴과 일치하지 않는 하이드레이션 문제 ${unmatched.length}건이 감지` +
              `되었습니다. ${issue}가 아닌 새로운 하이드레이션 회귀일 수 있습니다:\n` +
              `${unmatched.map((issueFound) => issueFound.label).join('\n')}`
          ).toEqual([]);
        } else {
          // 눈감아준 하이드레이션 문제를 webServer 로그를 뒤지지 않고도 테스트 출력에서
          // 바로 확인할 수 있도록 한 줄로 남긴다. 동일한 메시지가 여러 번 잡히는 경우가
          // 흔하므로(예: 같은 하이드레이션 오류가 pageerror와 console 양쪽에 찍힘) 중복은
          // 제거해 신호 대 잡음비를 유지한다.
          const labels = hydrationIssues.map((issueFound) => issueFound.label);
          console.log(
            `[knownHydrationBug ${issue}] ${[...new Set(labels)].join(' | ')}`
          );
        }
      } else {
        // 이번 실행에서는 아무 것도 감지되지 않았다 — 버그가 고쳐졌을 수도, 그저
        // 이번 실행에서 재현되지 않았을 뿐일 수도 있다. 어느 쪽인지 테스트 하나로는
        // 판별할 수 없으므로 실패시키지 않고, 사람이 확인해서 지울 수 있도록 grep하기
        // 쉬운 접두사를 단 경고만 남긴다.
        console.warn(
          `[STALE_HYDRATION_WAIVER] knownHydrationBug: ${issue}로 웨이버가 ` +
            `선언되어 있지만 이번 실행에서는 하이드레이션 관련 경고/에러가 감지되지 ` +
            `않았습니다. ${issue} 이슈가 해결되었을 수 있으니 재현 여부를 ` +
            `확인하고, 해결되었다면 test.use({ knownHydrationBug }) 웨이버를 제거하고 ` +
            `해당 이슈를 닫아주세요.`
        );
      }
    } else {
      expect(
        hydrationIssues.map((issueFound) => issueFound.label),
        `하이드레이션 관련 경고/에러 ${hydrationIssues.length}건 감지:\n${hydrationIssues.map((issueFound) => issueFound.label).join('\n')}`
      ).toEqual([]);
    }
  },
});

export { expect };
