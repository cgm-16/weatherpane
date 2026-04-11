import { test, expect } from '@playwright/test';

function getCssVar(
  page: import('@playwright/test').Page,
  varName: string,
  element: string = 'html'
) {
  return page.evaluate(
    ({ varName, element }) => {
      const el = document.querySelector(element)!;
      return getComputedStyle(el).getPropertyValue(varName).trim();
    },
    { varName, element }
  );
}

test.describe('디자인 토큰 — Haet-Ssal (밝은 모드)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Force light mode: remove .dark class if present
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
  });

  test('기본 색상 토큰이 Haet-Ssal 값으로 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-background')).toBe('#fcf9f8');
    expect(await getCssVar(page, '--color-foreground')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-primary')).toBe('#ba0036');
    expect(await getCssVar(page, '--color-primary-foreground')).toBe('#ffffff');
  });

  test('경계선 및 입력 토큰이 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-border')).toBe('#e5bdbe');
    expect(await getCssVar(page, '--color-ring')).toBe('#ba0036');
    expect(await getCssVar(page, '--color-muted-foreground')).toBe('#5c3f41');
  });

  test('반경 토큰이 정의된다', async ({ page }) => {
    expect(await getCssVar(page, '--radius-md')).toBe('1.5rem');
    expect(await getCssVar(page, '--radius-full')).toBe('9999px');
  });
});

test.describe('디자인 토큰 — Dal-Bit Night (어두운 모드)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Force dark mode via class
    await page.evaluate(() => document.documentElement.classList.add('dark'));
  });

  test('어두운 모드 색상 토큰이 Dal-Bit Night 값으로 전환된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-background')).toBe('#131313');
    expect(await getCssVar(page, '--color-foreground')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-primary')).toBe('#ffb2b6');
    expect(await getCssVar(page, '--color-primary-foreground')).toBe('#68001a');
  });

  test('어두운 모드 경계선 및 음소거 색상이 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-border')).toBe('#5c3f41');
    expect(await getCssVar(page, '--color-ring')).toBe('#ffb2b6');
    expect(await getCssVar(page, '--color-muted-foreground')).toBe('#e5bdbe');
  });
});
