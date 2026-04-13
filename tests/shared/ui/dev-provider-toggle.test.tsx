// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { DevProviderToggle } from '~/shared/ui/dev-provider-toggle';

const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('DevProviderToggle', () => {
  it('renders nothing when isDev is false', () => {
    const { container } = render(
      <DevProviderToggle currentMode="mock" isDev={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders toggle button in dev mode showing current mode', () => {
    render(<DevProviderToggle currentMode="mock" isDev={true} />);
    expect(screen.getByRole('button')).toBeVisible();
    expect(screen.getByRole('button')).toHaveTextContent(/mock/i);
  });

  it('clicking when in mock mode writes real to localStorage and reloads', async () => {
    render(<DevProviderToggle currentMode="mock" isDev={true} />);
    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('__wp_dev_provider_mode')).toBe('real');
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('clicking when in real mode writes mock to localStorage and reloads', async () => {
    render(<DevProviderToggle currentMode="real" isDev={true} />);
    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('__wp_dev_provider_mode')).toBe('mock');
    expect(mockReload).toHaveBeenCalledOnce();
  });
});
