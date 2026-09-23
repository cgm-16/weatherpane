import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'tailwindcss';
import { expect, test } from 'vitest';

test('앱의 반경 유틸리티가 유효한 CSS 변수 참조로 컴파일된다', async () => {
  const candidates = new Set<string>();
  for (const file of readdirSync('frontend', {
    recursive: true,
    encoding: 'utf8',
  })) {
    if (!file.endsWith('.tsx')) continue;
    const source = readFileSync(join('frontend', file), 'utf8');
    for (const [utility] of source.matchAll(
      /rounded(?:-[a-z]+)?-(?:\[--radius-[a-z]+\]|\(--radius-[a-z]+\))/g
    )) {
      candidates.add(utility);
    }
  }

  const compiler = await compile('@tailwind utilities;');
  const css = compiler.build([...candidates]);

  expect(css).not.toMatch(/border(?:-[a-z]+)*-radius:\s*--radius-/);
  expect(css).toContain('border-radius: var(--radius-sm)');
  expect(css).toContain('border-radius: var(--radius-md)');
  expect(css).toContain('border-radius: var(--radius-lg)');
  expect(css).toContain('border-top-left-radius: var(--radius-lg)');
  expect(css).toContain('border-top-right-radius: var(--radius-lg)');
});
