// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { DetailAqiCard } from '../frontend/pages/location/ui/detail-aqi-card';
import { DetailUvCard } from '../frontend/pages/location/ui/detail-uv-card';
import type { Aqi } from '../frontend/entities/aqi/model/aqi';

const aqi: Aqi = {
  locationId: 'loc_test',
  fetchedAt: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  summary: { aqi: 2, category: 'fair' },
  pollutants: { co: 200, no2: 10, o3: 50, pm10: 25, pm25: 15, so2: 3 },
  source: { provider: 'mock' },
};

describe('DetailAqiCard', () => {
  test('AQI 값과 카테고리를 표시한다', () => {
    render(<DetailAqiCard aqi={aqi} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  test('상세 보기 버튼 클릭 시 오염물질 드로어가 열린다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    expect(
      screen.getByRole('dialog', { name: /대기질 상세/ })
    ).toBeInTheDocument();
  });

  test('드로어에서 PM10, PM2.5 값을 표시한다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    expect(screen.getByText(/PM10/)).toBeInTheDocument();
    expect(screen.getByText(/PM2\.5/)).toBeInTheDocument();
  });

  test('드로어 닫기 버튼 클릭 시 드로어가 닫힌다', async () => {
    const user = userEvent.setup();
    render(<DetailAqiCard aqi={aqi} />);
    await user.click(screen.getByRole('button', { name: /대기질 상세 보기/ }));
    await user.click(screen.getByRole('button', { name: /닫기/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DetailUvCard', () => {
  test('UV 지수가 있으면 값을 표시한다', () => {
    render(<DetailUvCard uvIndex={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  test('UV 지수가 없으면 "—"을 표시한다', () => {
    render(<DetailUvCard uvIndex={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('상세 보기 버튼 클릭 시 UV 드로어가 열린다', async () => {
    const user = userEvent.setup();
    render(<DetailUvCard uvIndex={8} />);
    await user.click(
      screen.getByRole('button', { name: /자외선 지수 상세 보기/ })
    );
    expect(
      screen.getByRole('dialog', { name: /자외선 지수 상세/ })
    ).toBeInTheDocument();
  });

  test('드로어 닫기 버튼 클릭 시 드로어가 닫힌다', async () => {
    const user = userEvent.setup();
    render(<DetailUvCard uvIndex={8} />);
    await user.click(
      screen.getByRole('button', { name: /자외선 지수 상세 보기/ })
    );
    await user.click(screen.getByRole('button', { name: /닫기/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('UV 지수가 없으면 상세 보기 버튼이 없다', () => {
    render(<DetailUvCard uvIndex={undefined} />);
    expect(
      screen.queryByRole('button', { name: /상세 보기/ })
    ).not.toBeInTheDocument();
  });
});
