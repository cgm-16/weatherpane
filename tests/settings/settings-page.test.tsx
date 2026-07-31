// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as SettingsFeature from '../../frontend/features/settings';

const SettingsControls = (
  SettingsFeature as typeof SettingsFeature & {
    SettingsControls?: ComponentType;
  }
).SettingsControls;

function renderSettingsControls() {
  expect(
    SettingsControls,
    '설정 컨트롤은 settings feature 공개 API에서 제공되어야 한다'
  ).toBeTypeOf('function');
  if (!SettingsControls) return;

  render(
    <SettingsFeature.ThemeProvider>
      <SettingsFeature.SettingsProvider>
        <SettingsControls />
      </SettingsFeature.SettingsProvider>
    </SettingsFeature.ThemeProvider>
  );
}

describe('SettingsControls', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        matches: false,
        media: query,
        removeEventListener: vi.fn(),
      })),
      writable: true,
    });
  });

  test('현재 테마, 온도 단위, 동작 줄이기 선택을 라디오 그룹으로 표시한다', () => {
    renderSettingsControls();

    expect(screen.getByRole('group', { name: '테마' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '온도 단위' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '동작 줄이기' })
    ).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: '시스템' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '밝게' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '어둡게' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '섭씨' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '화씨' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '시스템 설정' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '줄이기' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '허용' })).not.toBeChecked();
  });

  test('선택한 각 환경설정을 해당 setter에 전달한다', async () => {
    const user = userEvent.setup();
    renderSettingsControls();

    await user.click(screen.getByRole('radio', { name: '어둡게' }));
    await user.click(screen.getByRole('radio', { name: '화씨' }));
    await user.click(screen.getByRole('radio', { name: '줄이기' }));

    expect(screen.getByRole('radio', { name: '어둡게' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '화씨' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '줄이기' })).toBeChecked();
    expect(localStorage.getItem('weatherpane.theme.v1')).toBe(
      JSON.stringify({ data: 'dark', version: 1 })
    );
    expect(localStorage.getItem('weatherpane.settings.v1')).toBe(
      JSON.stringify({
        data: { motionPreference: 'reduced', temperatureUnit: 'F' },
        version: 1,
      })
    );
  });

  test('키보드 방향키로 테마 선택을 변경할 수 있다', async () => {
    const user = userEvent.setup();
    renderSettingsControls();
    const systemRadio = screen.getByRole('radio', { name: '시스템' });

    systemRadio.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: '밝게' })).toBeChecked();
    expect(localStorage.getItem('weatherpane.theme.v1')).toBe(
      JSON.stringify({ data: 'light', version: 1 })
    );
  });
});
