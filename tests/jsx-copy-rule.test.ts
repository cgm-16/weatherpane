import { ESLint, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import koreanJsxText from '../scripts/eslint/korean-jsx-text';
import { describe, expect, it } from 'vitest';

it('실제 ESLint 설정이 영문 JSX 텍스트를 오류로 보고한다', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    'export const Example = () => <p>Something went wrong.</p>;',
    { filePath: 'frontend/pages/copy-probe.tsx' }
  );
  expect(result.messages).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'weatherpane/korean-jsx-text',
        severity: 2,
      }),
    ])
  );
});

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('korean-jsx-text', koreanJsxText, {
  valid: [
    '<p>날씨를 불러오지 못했습니다.</p>',
    '<p>  23° / 12% — </p>',
    '<p>API 키 및 AQI, URL이 필요합니다.</p>',
    '<p>오류 코드: CONNECTION_FAILED</p>',
    '<p>Weatherpane</p>',
    '<><span>H</span><span>L</span></>',
    '<span className="material-symbols-outlined text-xl">refresh</span>',
    '<span className="material-symbols-outlined">keyboard_arrow_up</span>',
    `<span className={['material-symbols-outlined', busy ? 'animate-spin' : ''].join(' ')}>refresh</span>`,
    `<p>{/* eslint-disable-next-line rule-to-test/korean-jsx-text -- 기존 문구 */}
      Try Again
    </p>`,
    '<p title="English attribute">{ "Expression text" }</p>',
    '<>{/* English comment */}<span>한국어</span></>',
  ],
  invalid: [
    'Something went wrong.',
    "Don't worry!",
    'Try_Again',
    'RETRY_NOW',
    '다시 Try Again 해주세요',
    'API request failed',
    'Weatherpane failed',
    'CONNECTION_FAILED_AGAIN',
    'Open&amp;Settings',
    'Open&#32;Settings',
    'Hello\n  world',
  ]
    .map((text) => ({
      code: `<p>${text}</p>`,
      errors: [{ messageId: 'englishCopy' }],
    }))
    .concat([
      {
        code: '<span>refresh</span>',
        errors: [{ messageId: 'englishCopy' }],
      },
      {
        code: '<span className="material-symbols-outlined">Try Again</span>',
        errors: [{ messageId: 'englishCopy' }],
      },
      {
        code: '<span className="material-symbols-outlined-extra">refresh</span>',
        errors: [{ messageId: 'englishCopy' }],
      },
    ]),
});

it('현재 앱 전체에 문구 오류나 불필요한 예외가 없다', async () => {
  const results = await new ESLint().lintFiles([
    'frontend/**/*.{tsx,jsx}',
    'app/**/*.{tsx,jsx}',
  ]);
  const messages = results.flatMap((result) =>
    result.messages
      .filter(
        (message) =>
          message.ruleId === 'weatherpane/korean-jsx-text' ||
          message.message.includes('Unused eslint-disable')
      )
      .map((message) => ({ file: result.filePath, ...message }))
  );
  expect(messages).toEqual([]);
});
