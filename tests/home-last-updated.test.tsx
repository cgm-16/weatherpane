// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { LastUpdated } from '../frontend/shared/ui/last-updated';

// 이 Vitest 환경에서 userEvent + vi.useFakeTimers()를 함께 쓰면 중단된다.
// userEvent v14는 포인터 시뮬레이션에 setTimeout을 사용하는데, fake clock이
// 해당 타이머를 처리하지 않기 때문이다. 클릭 토글 테스트에는 같은 상태 전환을
// 포인터 지연 없이 검증할 수 있는 fireEvent를 사용한다.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('LastUpdated', () => {
  test('방금 업데이트된 시각은 "방금 전"으로 표시한다', () => {
    const now = new Date().toISOString();
    render(<LastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
  });

  test('5분 전 시각은 "5분 전"으로 표시한다', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<LastUpdated fetchedAt={fiveMinutesAgo} timezone="Asia/Seoul" />);
    expect(screen.getByText(/5분 전/)).toBeInTheDocument();
  });

  test('1분이 지나면 상대 시각이 자동으로 업데이트된다', () => {
    const now = new Date().toISOString();
    render(<LastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });
    expect(screen.getByText(/1분 전/)).toBeInTheDocument();
  });

  test('클릭하면 절대 시각이 표시된다', () => {
    const fetchedAt = '2026-04-12T09:00:00+09:00';
    render(<LastUpdated fetchedAt={fetchedAt} timezone="Asia/Seoul" />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    // Should show formatted absolute time (contains date/time digits)
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  test('90분 전 시각은 "1시간 전"으로 표시한다', () => {
    const ninetyMinutesAgo = new Date(
      Date.now() - 90 * 60 * 1000
    ).toISOString();
    render(<LastUpdated fetchedAt={ninetyMinutesAgo} timezone="Asia/Seoul" />);
    expect(screen.getByText(/1시간 전/)).toBeInTheDocument();
  });

  test('절대 시각 클릭 후 다시 클릭하면 상대 시각으로 돌아간다', () => {
    const now = new Date().toISOString();
    render(<LastUpdated fetchedAt={now} timezone="Asia/Seoul" />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    fireEvent.click(badge);
    expect(screen.getByText(/방금 전/)).toBeInTheDocument();
  });
});
