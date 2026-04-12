// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { HomeLastUpdated } from '../frontend/pages/home/ui/home-last-updated';

// userEvent + vi.useFakeTimers() hangs in this vitest environment because
// userEvent v14 uses setTimeout internally for pointer simulation and the fake
// clock prevents those timers from resolving. fireEvent is used for click
// toggle tests, which test the same state transition without pointer delays.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('HomeLastUpdated', () => {
  test('방금 업데이트된 시각은 "방금 전"으로 표시한다', () => {
    const now = new Date().toISOString();
    render(<HomeLastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
  });

  test('5분 전 시각은 "5분 전"으로 표시한다', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <HomeLastUpdated fetchedAt={fiveMinutesAgo} timezone="Asia/Seoul" />
    );
    expect(screen.getByText(/5분 전/)).toBeInTheDocument();
  });

  test('1분이 지나면 상대 시각이 자동으로 업데이트된다', () => {
    const now = new Date().toISOString();
    render(<HomeLastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });
    expect(screen.getByText(/1분 전/)).toBeInTheDocument();
  });

  test('클릭하면 절대 시각이 표시된다', () => {
    const fetchedAt = '2026-04-12T09:00:00+09:00';
    render(<HomeLastUpdated fetchedAt={fetchedAt} timezone="Asia/Seoul" />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    // Should show formatted absolute time (contains date/time digits)
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  test('절대 시각 클릭 후 다시 클릭하면 상대 시각으로 돌아간다', () => {
    const now = new Date().toISOString();
    render(<HomeLastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    fireEvent.click(badge);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
  });
});
