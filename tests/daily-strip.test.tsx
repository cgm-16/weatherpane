// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DailyStrip } from '../frontend/shared/ui/daily-strip';
import type { CoreWeatherDailyEntry } from '../frontend/entities/weather/model/core-weather';

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

// makeEntry는 UTC 자정 기준 날짜에 dayOffset일을 더해 항목을 생성한다. 시간대 의존
// 버그를 방지하기 위해 로컬 Date 메서드 대신 setUTCDate를 사용한다.
function makeEntry(
  dayOffset: number,
  minC: number,
  maxC: number
): CoreWeatherDailyEntry {
  const date = new Date('2025-01-01T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return { date: date.toISOString(), minC, maxC, condition };
}

describe('DailyStrip', () => {
  test('첫 번째 카드는 "오늘"로 표시한다', () => {
    const daily = [makeEntry(0, 10, 20), makeEntry(1, 9, 18)];
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.getByText('오늘')).toBeInTheDocument();
  });

  test('이후 카드는 요일로 표시한다', () => {
    // 2025-01-01(UTC)은 수요일 → dayOffset 1은 목요일
    const daily = [makeEntry(0, 10, 20), makeEntry(1, 9, 18)];
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.getByText('목')).toBeInTheDocument();
  });

  test('각 카드에 최고·최저 기온이 모두 표시된다', () => {
    const daily = [makeEntry(0, 10, 20)];
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.getByText(/20°/)).toBeInTheDocument();
    expect(screen.getByText(/10°/)).toBeInTheDocument();
  });

  test('화씨 선택 시 최고·최저 기온을 변환해 표시한다', () => {
    const daily = [makeEntry(0, 0, 10)]; // 0°C=32°F, 10°C=50°F
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="F" />);
    expect(screen.getByText(/50°/)).toBeInTheDocument();
    expect(screen.getByText(/32°/)).toBeInTheDocument();
  });

  test('빈 daily 배열은 빈 목록을 렌더링한다', () => {
    render(<DailyStrip daily={[]} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('count prop이 있으면 해당 수만큼 항목을 표시한다', () => {
    const manyDaily = Array.from({ length: 8 }, (_, i) =>
      makeEntry(i, 10 + i, 20 + i)
    );
    render(
      <DailyStrip
        daily={manyDaily}
        timeZone="UTC"
        count={5}
        temperatureUnit="C"
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  test('count prop 없이 최대 8개 카드를 렌더링한다', () => {
    const manyDaily = Array.from({ length: 10 }, (_, i) =>
      makeEntry(i, 10 + i, 20 + i)
    );
    render(<DailyStrip daily={manyDaily} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });
});
