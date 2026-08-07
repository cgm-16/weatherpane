import type { CoreWeatherDailyEntry } from '~/entities/weather/model/core-weather';
import {
  formatTemperature,
  type TemperatureUnit,
} from '~/shared/lib/temperature';

// visualBucket + isDay를 Material Symbols 아이콘 이름으로 변환한다.
function conditionIcon(entry: CoreWeatherDailyEntry): string {
  const { visualBucket, isDay } = entry.condition;
  if (visualBucket === 'clear') return isDay ? 'light_mode' : 'nights_stay';
  if (visualBucket === 'cloudy') return 'cloud';
  if (visualBucket === 'rainy') return 'rainy';
  if (visualBucket === 'snowy') return 'ac_unit';
  // TypeScript가 새 bucket 추가를 정적으로 검사하도록 보장한다.
  visualBucket satisfies never;
  return 'thermostat';
}

// 첫 번째 항목(index 0)은 날짜 비교 없이 위치 기준으로 "오늘"로 표시한다 —
// HourlyStrip이 index 0을 날짜 계산 없이 "지금"으로 다루는 방식과 동일하다.
function formatDay(
  entry: CoreWeatherDailyEntry,
  index: number,
  timeZone: string
): string {
  if (index === 0) return '오늘';
  return new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    timeZone,
  }).format(new Date(entry.date));
}

interface DailyStripProps {
  daily: CoreWeatherDailyEntry[];
  timeZone: string;
  count?: number;
  temperatureUnit: TemperatureUnit;
}

export function DailyStrip({
  daily,
  timeZone,
  count = 8,
  temperatureUnit,
}: DailyStripProps) {
  const entries = daily.slice(0, count);

  return (
    <ul
      className="flex gap-2 overflow-x-auto py-1"
      role="list"
      aria-label="일별 날씨 예보"
    >
      {entries.map((entry, index) => (
        <li
          key={entry.date}
          role="listitem"
          className="flex min-w-[60px] flex-shrink-0 flex-col items-center gap-1 rounded-[--radius-md] bg-card px-3 py-3"
        >
          <span className="font-body text-xs text-muted-foreground">
            {formatDay(entry, index, timeZone)}
          </span>
          <span className="material-symbols-outlined text-[20px] text-foreground">
            {conditionIcon(entry)}
          </span>
          <span className="font-body text-sm font-semibold text-foreground">
            {formatTemperature(entry.maxC, temperatureUnit)}
          </span>
          <span className="font-body text-xs text-muted-foreground">
            {formatTemperature(entry.minC, temperatureUnit)}
          </span>
        </li>
      ))}
    </ul>
  );
}
