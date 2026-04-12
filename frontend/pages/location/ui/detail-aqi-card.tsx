import { useState } from 'react';
import type { Aqi } from '~/entities/aqi/model/aqi';

const aqiCategoryLabel: Record<string, string> = {
  good: '좋음',
  fair: '보통',
  moderate: '민감군 나쁨',
  poor: '나쁨',
  'very-poor': '매우 나쁨',
};

// 사용자에게 표시할 오염물질 순서, 한국어 레이블, 단위
// CO는 OpenWeatherMap AQI API에서 mg/m³로 제공됩니다. 나머지는 μg/m³입니다.
const POLLUTANTS: Array<{
  key: keyof Aqi['pollutants'];
  label: string;
  unit: string;
}> = [
  { key: 'pm25', label: 'PM2.5 (초미세먼지)', unit: 'μg/m³' },
  { key: 'pm10', label: 'PM10 (미세먼지)', unit: 'μg/m³' },
  { key: 'o3', label: 'O₃ (오존)', unit: 'μg/m³' },
  { key: 'no2', label: 'NO₂ (이산화질소)', unit: 'μg/m³' },
  { key: 'so2', label: 'SO₂ (이산화황)', unit: 'μg/m³' },
  { key: 'co', label: 'CO (일산화탄소)', unit: 'mg/m³' },
  { key: 'nh3', label: 'NH₃ (암모니아)', unit: 'μg/m³' },
];

interface DetailAqiCardProps {
  aqi: Aqi;
}

export function DetailAqiCard({ aqi }: DetailAqiCardProps) {
  const [open, setOpen] = useState(false);
  // AQI는 유럽 1–5 순위 척도를 가정합니다 (1=좋음, 5=매우 나쁨).
  const clampedAqi = Math.min(5, Math.max(1, aqi.summary.aqi));

  return (
    <>
      <div className="flex flex-col gap-1 rounded-[--radius-md] bg-card p-4">
        <span className="material-symbols-outlined text-[20px] text-muted-foreground">
          air
        </span>
        <p className="font-body text-xs text-muted-foreground">대기질</p>
        <p className="font-display text-2xl font-bold text-foreground">
          {clampedAqi}
        </p>
        <p className="font-body text-xs text-muted-foreground">
          {aqiCategoryLabel[aqi.summary.category] ?? aqi.summary.category}
        </p>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${((clampedAqi - 1) / 4) * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 self-start font-body text-xs text-primary underline-offset-2 hover:underline"
          aria-label="대기질 상세 보기"
        >
          상세 보기
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="대기질 상세"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 bottom-0 left-0 max-h-[80vh] overflow-y-auto rounded-t-[--radius-lg] bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold text-foreground">
                대기질 상세
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
            <ul className="space-y-3">
              {POLLUTANTS.filter(({ key }) => aqi.pollutants[key] != null).map(
                ({ key, label, unit }) => (
                  <li key={key} className="flex items-center justify-between">
                    <span className="font-body text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="font-body text-sm font-semibold text-foreground">
                      {aqi.pollutants[key]} {unit}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
