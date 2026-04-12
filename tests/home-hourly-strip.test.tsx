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

function makeEntry(hour: number, tempC: number): CoreWeatherHourlyEntry {
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  return { at: at.toISOString(), temperatureC: tempC, popPct: 0, condition };
}

describe('HomeHourlyStrip', () => {
  test('최대 6개 카드를 렌더링한다', () => {
    const hourly = Array.from({ length: 8 }, (_, i) =>
      makeEntry(9 + i, 17 + i)
    );
    render(<HomeHourlyStrip hourly={hourly} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  test('각 카드에 기온이 표시된다', () => {
    const hourly = [makeEntry(9, 17)];
    render(<HomeHourlyStrip hourly={hourly} />);
    expect(screen.getByText(/17°/)).toBeInTheDocument();
  });

  test('빈 hourly 배열은 빈 목록을 렌더링한다', () => {
    render(<HomeHourlyStrip hourly={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
