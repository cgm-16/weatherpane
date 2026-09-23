// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { HomeConfigError } from '../frontend/pages/home/ui/home-config-error';
import { HomeConnectionError } from '../frontend/pages/home/ui/home-connection-error';
import type { ConfigError } from '../frontend/shared/lib/env-config';

const error: ConfigError = {
  code: 'INVALID_PROVIDER_MODE',
  field: 'VITE_WEATHER_PROVIDER_MODE',
  message: '값이 설정되지 않았습니다',
};

test('설정 오류의 한국어 버튼은 각 콜백이 있을 때만 표시하고 실행한다', async () => {
  const user = userEvent.setup();
  const onOpenSettings = vi.fn();
  const onRetry = vi.fn();
  const { rerender } = render(
    <HomeConfigError error={error} onOpenSettings={onOpenSettings} />
  );

  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  expect(onOpenSettings).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();

  rerender(<HomeConfigError error={error} onRetry={onRetry} />);
  expect(screen.queryByRole('button', { name: '설정 열기' })).toBeNull();
  await user.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(onRetry).toHaveBeenCalledTimes(1);

  rerender(<HomeConfigError error={error} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('연결 오류의 즐겨찾기 버튼은 콜백이 있을 때만 한국어로 표시하고 실행한다', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  const onGoToSavedPlaces = vi.fn();
  const { rerender } = render(
    <HomeConnectionError
      onRetry={onRetry}
      onGoToSavedPlaces={onGoToSavedPlaces}
    />
  );

  await user.click(screen.getByRole('button', { name: /즐겨찾기로 이동/ }));
  expect(onGoToSavedPlaces).toHaveBeenCalledTimes(1);
  expect(onRetry).not.toHaveBeenCalled();

  rerender(<HomeConnectionError onRetry={onRetry} />);
  expect(screen.queryByRole('button', { name: /즐겨찾기로 이동/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: /다시 시도/ }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
