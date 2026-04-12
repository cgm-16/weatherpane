import type { CoreWeatherHourlyEntry } from '~/entities/weather/model/core-weather';

// visualBucket + isDay를 Material Symbols 아이콘 이름으로 변환한다.
function conditionIcon(entry: CoreWeatherHourlyEntry): string {
  const { visualBucket, isDay } = entry.condition;
  if (visualBucket === 'clear') return isDay ? 'light_mode' : 'nights_stay';
  if (visualBucket === 'cloudy') return 'cloud';
  if (visualBucket === 'rainy') return 'rainy';
  if (visualBucket === 'snowy') return 'ac_unit';
  // TypeScript가 새 bucket 추가를 정적으로 검사하도록 보장한다.
  visualBucket satisfies never;
  return 'thermostat';
}

// ISO 문자열을 지정된 시간대의 한국어 오전/오후 시 형식으로 변환한다.
// ICU 로케일 데이터에 의존하지 않도록 Intl로 시각(24시간)을 추출한 뒤 한국어 서식을 수동으로 적용한다.
function formatHour(at: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(new Date(at));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  if (hour === 0) return '오전 12시';
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return '오후 12시';
  return `오후 ${hour - 12}시`;
}

interface HourlyStripProps {
  hourly: CoreWeatherHourlyEntry[];
  timeZone: string;
  count?: number;
}

export function HourlyStrip({ hourly, timeZone, count = 6 }: HourlyStripProps) {
  const entries = hourly.slice(0, count);

  return (
    <ul
      className="flex gap-2 overflow-x-auto py-1"
      role="list"
      aria-label="시간별 날씨 예보"
    >
      {entries.map((entry) => (
        <li
          key={entry.at}
          role="listitem"
          className="flex min-w-[60px] flex-shrink-0 flex-col items-center gap-1 rounded-[--radius-md] bg-card px-3 py-3"
        >
          <span className="font-body text-xs text-muted-foreground">
            {formatHour(entry.at, timeZone)}
          </span>
          <span className="material-symbols-outlined text-[20px] text-foreground">
            {conditionIcon(entry)}
          </span>
          <span className="font-body text-sm font-semibold text-foreground">
            {Math.round(entry.temperatureC)}°
          </span>
        </li>
      ))}
    </ul>
  );
}
