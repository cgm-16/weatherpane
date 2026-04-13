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

function normalizeCssValue(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

test.describe('디자인 토큰 — Haet-Ssal (밝은 모드)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 라이트 모드 강제: .dark 클래스가 있으면 제거
    await page.evaluate(() =>
      document.documentElement.classList.remove('dark')
    );
  });

  test('기본 색상 토큰이 Haet-Ssal 값으로 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-background')).toBe('#fcf9f8');
    expect(await getCssVar(page, '--color-foreground')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-card')).toBe('#ffffff');
    expect(await getCssVar(page, '--color-card-foreground')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-popover')).toBe('#ffffff');
    expect(await getCssVar(page, '--color-popover-foreground')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-primary')).toBe('#ba0036');
    expect(await getCssVar(page, '--color-primary-foreground')).toBe('#ffffff');
    expect(await getCssVar(page, '--color-secondary')).toBe('#5e5e5e');
    expect(await getCssVar(page, '--color-secondary-foreground')).toBe(
      '#ffffff'
    );
    expect(await getCssVar(page, '--color-accent')).toBe('#eae7e7');
    expect(await getCssVar(page, '--color-accent-foreground')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-muted')).toBe('#f0eded');
    expect(await getCssVar(page, '--color-destructive')).toBe('#ba1a1a');
    expect(await getCssVar(page, '--color-destructive-foreground')).toBe(
      '#ffffff'
    );
  });

  test('경계선 및 입력 토큰이 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-border')).toBe('#e5bdbe');
    expect(await getCssVar(page, '--color-input')).toBe('#f6f3f2');
    expect(await getCssVar(page, '--color-ring')).toBe('#ba0036');
    expect(await getCssVar(page, '--color-muted-foreground')).toBe('#5c3f41');
  });

  test('반경 토큰이 정의된다', async ({ page }) => {
    expect(await getCssVar(page, '--radius-sm')).toBe('0.5rem');
    expect(await getCssVar(page, '--radius-md')).toBe('1.5rem');
    expect(await getCssVar(page, '--radius-lg')).toBe('2rem');
    expect(await getCssVar(page, '--radius-full')).toBe('9999px');
  });

  test('서체 및 그림자 토큰이 정의된다', async ({ page }) => {
    expect(await getCssVar(page, '--font-display')).toBe(
      "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif"
    );
    expect(await getCssVar(page, '--font-body')).toBe(
      "'Be Vietnam Pro', sans-serif"
    );
    expect(await getCssVar(page, '--font-sans')).toBe(
      "'Be Vietnam Pro', sans-serif"
    );
    expect(normalizeCssValue(await getCssVar(page, '--shadow-float'))).toBe(
      '0px 2px 4px rgba(27, 28, 28, 0.04), 0px 4px 12px rgba(27, 28, 28, 0.04), 0px 10px 24px rgba(27, 28, 28, 0.04)'
    );
  });

  test('tertiary 및 glassmorphism 토큰이 정의된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-tertiary')).toBe('#006a45');
    expect(await getCssVar(page, '--color-surface-container-highest')).toBe(
      '#ffffff'
    );
    expect(await getCssVar(page, '--color-surface-bright')).toBe('#f0eded');
  });
});

test.describe('디자인 토큰 — Dal-Bit Night (어두운 모드)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // React 하이드레이션이 완전히 완료된 후 다크 모드 강제 적용.
    // networkidle 대기 없이 바로 evaluate하면 ThemeProvider useEffect가 나중에 실행되어
    // 수동으로 추가한 .dark 클래스를 제거할 수 있다.
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    // 클래스가 실제로 적용될 때까지 대기
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('dark')
    );
  });

  test('어두운 모드 색상 토큰이 Dal-Bit Night 값으로 전환된다', async ({
    page,
  }) => {
    expect(await getCssVar(page, '--color-background')).toBe('#131313');
    expect(await getCssVar(page, '--color-foreground')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-card')).toBe('#1c1b1b');
    expect(await getCssVar(page, '--color-card-foreground')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-popover')).toBe('#20201f');
    expect(await getCssVar(page, '--color-popover-foreground')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-primary')).toBe('#ffb2b6');
    expect(await getCssVar(page, '--color-primary-foreground')).toBe('#68001a');
    expect(await getCssVar(page, '--color-secondary')).toBe('#ffb2b6');
    expect(await getCssVar(page, '--color-secondary-foreground')).toBe(
      '#67001a'
    );
    expect(await getCssVar(page, '--color-accent')).toBe('#2a2a2a');
    expect(await getCssVar(page, '--color-accent-foreground')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-muted')).toBe('#20201f');
    expect(await getCssVar(page, '--color-destructive')).toBe('#ffb4ab');
    expect(await getCssVar(page, '--color-destructive-foreground')).toBe(
      '#690005'
    );
  });

  test('어두운 모드 경계선 및 음소거 색상이 적용된다', async ({ page }) => {
    expect(await getCssVar(page, '--color-border')).toBe('#5c3f41');
    expect(await getCssVar(page, '--color-input')).toBe('#1c1b1b');
    expect(await getCssVar(page, '--color-ring')).toBe('#ffb2b6');
    expect(await getCssVar(page, '--color-muted-foreground')).toBe('#e5bdbe');
  });

  test('어두운 모드 반경과 서체 및 그림자 토큰이 정의된다', async ({
    page,
  }) => {
    expect(await getCssVar(page, '--radius-sm')).toBe('0.5rem');
    expect(await getCssVar(page, '--radius-md')).toBe('1.5rem');
    expect(await getCssVar(page, '--radius-lg')).toBe('2rem');
    expect(await getCssVar(page, '--radius-full')).toBe('9999px');
    expect(await getCssVar(page, '--font-display')).toBe(
      "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif"
    );
    expect(await getCssVar(page, '--font-body')).toBe(
      "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif"
    );
    expect(await getCssVar(page, '--font-sans')).toBe(
      "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif"
    );
    expect(normalizeCssValue(await getCssVar(page, '--shadow-float'))).toBe(
      '0px 2px 4px rgba(229, 226, 225, 0.04), 0px 4px 12px rgba(229, 226, 225, 0.04), 0px 10px 24px rgba(229, 226, 225, 0.04)'
    );
  });

  test('어두운 모드 tertiary 및 glassmorphism 토큰이 정의된다', async ({
    page,
  }) => {
    expect(await getCssVar(page, '--color-tertiary')).toBe('#62dca3');
    expect(await getCssVar(page, '--color-surface-bright')).toBe('#393939');
  });
});
