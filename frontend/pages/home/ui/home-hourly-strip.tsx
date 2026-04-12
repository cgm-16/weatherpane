import type { CoreWeatherHourlyEntry } from '~/entities/weather/model/core-weather';

// visualBucket + isDay를 Material Symbols 아이콘 이름으로 변환한다.
function conditionIcon(entry: CoreWeatherHourlyEntry): string {
  const { visualBucket, isDay } = entry.condition;
  if (visualBucket === 'clear') return isDay ? 'light_mode' : 'nights_stay';
  if (visualBucket === 'cloudy') return 'cloud';
  if (visualBucket === 'rainy') return 'rainy';
  if (visualBucket === 'snowy') return 'ac_unit';
  return 'thermostat';
}

// ISO 문자열을 한국어 오전/오후 시 형식으로 변환한다.
function formatHour(at: string): string {
  const date = new Date(at);
  const hour = date.getHours();
  return hour < 12
    ? `오전 ${hour}시`
    : hour === 12
      ? '오후 12시'
      : `오후 ${hour - 12}시`;
}

interface HomeHourlyStripProps {
  hourly: CoreWeatherHourlyEntry[];
}

export function HomeHourlyStrip({ hourly }: HomeHourlyStripProps) {
  const entries = hourly.slice(0, 6);

  return (
    <ul className="flex gap-2 overflow-x-auto py-1" role="list">
      {entries.map((entry) => (
        <li
          key={entry.at}
          role="listitem"
          className="flex min-w-[60px] flex-shrink-0 flex-col items-center gap-1 rounded-[--radius-md] bg-card px-3 py-3"
        >
          <span className="font-body text-xs text-muted-foreground">
            {formatHour(entry.at)}
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
