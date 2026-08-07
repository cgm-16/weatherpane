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

// timeZone 기준 캘린더 날짜를 YYYY-MM-DD로 반환한다 — en-CA 로케일이 이 형식을 그대로 제공한다.
function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

// entry.date가 timeZone 기준 오늘과 같을 때만 "오늘"로 표시한다. 위치(index 0)만
// 보고 판단하면, 24시간까지 유효한 스냅샷이 자정을 넘겼을 때 어제 날짜를 "오늘"로
// 잘못 표시할 수 있다.
function formatDay(entry: CoreWeatherDailyEntry, timeZone: string): string {
  const entryDate = new Date(entry.date);
  if (toDateKey(entryDate, timeZone) === toDateKey(new Date(), timeZone)) {
    return '오늘';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    timeZone,
  }).format(entryDate);
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
      {entries.map((entry) => (
        <li
          key={entry.date}
          role="listitem"
          className="flex min-w-[60px] flex-shrink-0 flex-col items-center gap-1 rounded-[--radius-md] bg-card px-3 py-3"
        >
          <span className="font-body text-xs text-muted-foreground">
            {formatDay(entry, timeZone)}
          </span>
          <span
            role="img"
            aria-label={entry.condition.text}
            className="material-symbols-outlined text-[20px] text-foreground"
          >
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
