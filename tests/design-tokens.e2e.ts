import { test, expect } from './fixtures';

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
    await page.addInitScript(() => {
      const v = JSON.stringify({ version: 1, data: 'light' });
      localStorage.setItem('weatherpane.theme.v1', v);
      sessionStorage.setItem('weatherpane.theme.v1', v);
    });
    await page.goto('/');
    // React ThemeProvider가 .dark 없이 안정화될 때까지 대기한다.
    await page.waitForFunction(
      () => !document.documentElement.classList.contains('dark')
    );
  });

  test('오류 화면 MD3 토큰이 Haet-Ssal 값으로 적용된다', async ({ page }) => {
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
    expect(await getCssVar(page, '--color-on-surface')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-on-surface-variant')).toBe('#5c3f41');
    expect(await getCssVar(page, '--color-secondary-container')).toBe(
      '#e3e2e2'
    );
    expect(await getCssVar(page, '--color-outline-variant')).toBe('#e5bdbe');
    expect(await getCssVar(page, '--color-primary-container')).toBe('#e21e4a');
    expect(await getCssVar(page, '--color-on-primary-container')).toBe(
      '#fffbff'
    );
    expect(await getCssVar(page, '--color-on-primary')).toBe('#ffffff');
    expect(await getCssVar(page, '--color-on-secondary-fixed')).toBe('#1b1c1c');
    expect(await getCssVar(page, '--color-surface-container-high')).toBe(
      '#eae7e7'
    );
    expect(await getCssVar(page, '--color-surface-container-lowest')).toBe(
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
    expect(await getCssVar(page, '--color-scrim')).toBe('#131313');
  });
});

test.describe('디자인 토큰 — Dal-Bit Night (어두운 모드)', () => {
  test.beforeEach(async ({ page }) => {
    // 내비게이션 전 스토리지 키를 설정해 ThemeProvider가 정상 초기화 경로로 다크 모드를 적용하도록 한다
    await page.addInitScript(() => {
      const v = JSON.stringify({ version: 1, data: 'dark' });
      localStorage.setItem('weatherpane.theme.v1', v);
      sessionStorage.setItem('weatherpane.theme.v1', v);
    });
    await page.goto('/');
    // ThemeProvider의 useEffect가 .dark를 확정 적용할 때까지 대기한다.
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('dark')
    );
  });

  test('어두운 모드 오류 화면 MD3 토큰이 Dal-Bit Night 값으로 전환된다', async ({
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
    expect(await getCssVar(page, '--color-on-surface')).toBe('#e5e2e1');
    expect(await getCssVar(page, '--color-on-surface-variant')).toBe('#e5bdbe');
    expect(await getCssVar(page, '--color-secondary-container')).toBe(
      '#8a1f31'
    );
    expect(await getCssVar(page, '--color-outline-variant')).toBe('#5c3f41');
    expect(await getCssVar(page, '--color-primary-container')).toBe('#ff5169');
    expect(await getCssVar(page, '--color-on-primary-container')).toBe(
      '#5b0016'
    );
    expect(await getCssVar(page, '--color-on-primary')).toBe('#68001a');
    expect(await getCssVar(page, '--color-on-secondary-fixed')).toBe('#40000d');
    expect(await getCssVar(page, '--color-surface-container-high')).toBe(
      '#2a2a2a'
    );
    expect(await getCssVar(page, '--color-surface-container-lowest')).toBe(
      '#0e0e0e'
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
    expect(await getCssVar(page, '--color-scrim')).toBe('#131313');
  });
});

for (const theme of ['light', 'dark']) {
  test(`${theme} 모드에서 카드·버튼·상단 패널 반경이 적용된다`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(
      theme === 'light'
        ? { width: 1280, height: 720 }
        : { width: 390, height: 844 }
    );
    await page.addInitScript((theme) => {
      localStorage.setItem(
        'weatherpane.theme.v1',
        JSON.stringify({ version: 1, data: theme })
      );
    }, theme);
    await page.goto('/location/unsupported::KR-Busan');
    await expect(
      page.getByRole('link', { name: '검색으로 돌아가기' })
    ).toHaveCSS('border-radius', '8px');
    await expect(page.getByRole('main').locator(':scope > div')).toHaveCSS(
      'border-radius',
      '32px'
    );
    await page.screenshot({
      path: testInfo.outputPath('radius-error.png'),
      fullPage: true,
    });
    await testInfo.attach('오류 화면 반경', {
      path: testInfo.outputPath('radius-error.png'),
      contentType: 'image/png',
    });

    await page.goto('/location/loc_5f5def784f91');
    await expect(
      page
        .getByRole('list', { name: '시간별 날씨 예보' })
        .getByRole('listitem')
        .first()
    ).toHaveCSS('border-radius', '24px');
    await page.getByRole('button', { name: '대기질 상세 보기' }).click();
    const panel = page
      .getByRole('dialog', { name: '대기질 상세', exact: true })
      .locator(':scope > div')
      .last();
    await expect(panel).toHaveCSS('border-top-left-radius', '32px');
    await expect(panel).toHaveCSS('border-top-right-radius', '32px');
    await expect(panel).toHaveCSS('border-bottom-left-radius', '0px');
    await expect(panel).toHaveCSS('border-bottom-right-radius', '0px');
    await page.screenshot({
      path: testInfo.outputPath('radius-panel.png'),
      fullPage: true,
    });
    await testInfo.attach('상단 패널 반경', {
      path: testInfo.outputPath('radius-panel.png'),
      contentType: 'image/png',
    });
  });
}
