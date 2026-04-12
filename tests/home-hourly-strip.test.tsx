// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { HomeHourlyStrip } from '../frontend/pages/home/ui/home-hourly-strip';
import type { CoreWeatherHourlyEntry } from '../frontend/entities/weather/model/core-weather';

const condition = {
  code: 'CLEAR',
  text: '맑음',
  isDay: true,
  visualBucket: 'clear' as const,
  textMapping: {
    conditionCode: 'CLEAR',
    isDay: true,
    precipitationKind: 'none' as const,
    cloudCoverPct: 0,
    intensity: 'none' as const,
  },
};

// makeEntry는 UTC 시각을 기준으로 항목을 생성한다. 시간대 의존 버그를 방지하기 위해
// setHours(로컬) 대신 setUTCHours를 사용한다.
function makeEntry(utcHour: number, tempC: number): CoreWeatherHourlyEntry {
  const at = new Date('2025-01-01T00:00:00.000Z');
  at.setUTCHours(utcHour, 0, 0, 0);
  return { at: at.toISOString(), temperatureC: tempC, popPct: 0, condition };
}

describe('HomeHourlyStrip', () => {
  test('최대 6개 카드를 렌더링한다', () => {
    const hourly = Array.from({ length: 8 }, (_, i) => makeEntry(i, 17 + i));
    render(<HomeHourlyStrip hourly={hourly} timeZone="Asia/Seoul" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  test('각 카드에 기온이 표시된다', () => {
    // UTC 00:00 = Seoul 09:00
    const hourly = [makeEntry(0, 17)];
    render(<HomeHourlyStrip hourly={hourly} timeZone="Asia/Seoul" />);
    expect(screen.getByText(/17°/)).toBeInTheDocument();
  });

  test('빈 hourly 배열은 빈 목록을 렌더링한다', () => {
    render(<HomeHourlyStrip hourly={[]} timeZone="Asia/Seoul" />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('서울 자정(UTC 15:00)은 "오전 12시"로 표시한다', () => {
    // UTC 15:00 = Seoul 00:00 (자정)
    const entry = makeEntry(15, 15);
    render(<HomeHourlyStrip hourly={[entry]} timeZone="Asia/Seoul" />);
    expect(screen.getByText('오전 12시')).toBeInTheDocument();
  });

  test('서울 정오(UTC 03:00)는 "오후 12시"로 표시한다', () => {
    // UTC 03:00 = Seoul 12:00 (정오)
    const entry = makeEntry(3, 20);
    render(<HomeHourlyStrip hourly={[entry]} timeZone="Asia/Seoul" />);
    expect(screen.getByText('오후 12시')).toBeInTheDocument();
  });
});
