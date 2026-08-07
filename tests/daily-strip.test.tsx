// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

// "오늘" 라벨은 실제(또는 고정된) 현재 날짜와 entry.date를 비교해 결정되므로,
// dayOffset 0을 "오늘"로 취급하는 테스트들은 시스템 시각을 그 날짜로 고정해야 한다.
const FROZEN_TODAY = new Date('2025-01-01T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_TODAY);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('DailyStrip', () => {
  test('시스템 날짜와 일치하는 카드는 "오늘"로 표시한다', () => {
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

  test('시스템 날짜가 자정을 넘기면 지난 항목은 더 이상 "오늘"로 표시되지 않는다', () => {
    // 24시간까지 유효한 스냅샷이 자정을 넘겨 렌더링되는 상황을 흉내낸다.
    vi.setSystemTime(new Date('2025-01-02T00:30:00.000Z'));
    const daily = [makeEntry(0, 10, 20), makeEntry(1, 9, 18)];
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="C" />);
    // dayOffset 0(2025-01-01, 수요일)은 더 이상 오늘이 아니므로 실제 요일로 표시된다.
    expect(screen.getByText('수')).toBeInTheDocument();
    // dayOffset 1(2025-01-02)이 이제 실제 오늘과 일치하므로 "오늘" 라벨은 정확히 하나뿐이다.
    expect(screen.getAllByText('오늘')).toHaveLength(1);
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

  test('조건 아이콘에 접근 가능한 이름을 제공한다', () => {
    const daily = [makeEntry(0, 10, 20)];
    render(<DailyStrip daily={daily} timeZone="UTC" temperatureUnit="C" />);
    expect(screen.getByRole('img', { name: '맑음' })).toBeInTheDocument();
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
