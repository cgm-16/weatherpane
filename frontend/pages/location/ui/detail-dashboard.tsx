import { Link } from 'react-router';
import { useFavorites } from '~/features/favorites/use-favorites';
import { HourlyStrip } from '~/shared/ui/hourly-strip';
import { DetailAqiCard } from './detail-aqi-card';
import { DetailUvCard } from './detail-uv-card';
import type { ResolvedLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';
import type { Aqi } from '~/entities/aqi/model/aqi';

interface DetailDashboardProps {
  location: ResolvedLocation;
  weather: CoreWeather;
  aqi: Aqi;
  isRefreshing: boolean;
  hasRefreshError: boolean;
  onRefresh: () => void;
}

export function DetailDashboard({
  location,
  weather,
  aqi,
  isRefreshing,
  hasRefreshError,
  onRefresh,
}: DetailDashboardProps) {
  const { isFavorite, toggleFavorite, atMaxFavorites } = useFavorites();
  const favorited = isFavorite(location.locationId);

  return (
    <main className="flex min-h-screen flex-col bg-background" role="main">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3">
        <Link
          to="/"
          aria-label="홈으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
        >
          <span className="material-symbols-outlined text-[22px]">
            arrow_back
          </span>
        </Link>
        <span className="font-display text-lg font-bold text-foreground">
          {location.name}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="새로고침"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground disabled:opacity-40"
          >
            <span
              className={[
                'material-symbols-outlined text-[22px]',
                isRefreshing ? 'animate-spin' : '',
              ].join(' ')}
            >
              refresh
            </span>
          </button>
          <button
            type="button"
            aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            disabled={!favorited && atMaxFavorites}
            onClick={() => toggleFavorite(location)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[22px]">
              {favorited ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>
      </header>

      {/* 비차단 새로고침 오류 */}
      {hasRefreshError && (
        <div
          role="alert"
          className="mx-4 rounded-[--radius-sm] bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          새로고침에 실패했습니다. 이전 날씨 정보를 표시합니다.
        </div>
      )}

      {/* 현재 날씨 카드 */}
      <div className="mx-4 mt-3 flex flex-col items-center gap-2 rounded-[--radius-md] bg-card px-6 py-8">
        <p className="font-display text-7xl font-extrabold text-foreground">
          {Math.round(weather.current.temperatureC)}°
        </p>
        <p className="font-body text-base text-muted-foreground">
          {weather.current.condition.text}
        </p>
        <div className="flex gap-4">
          <span className="font-body text-sm text-muted-foreground">
            H {Math.round(weather.today.maxC)}°
          </span>
          <span className="font-body text-sm text-muted-foreground">
            L {Math.round(weather.today.minC)}°
          </span>
        </div>
      </div>

      {/* 12시간 시간별 예보 */}
      {weather.hourly.length > 0 && (
        <section className="px-4 pt-4" aria-label="시간별 예보">
          <HourlyStrip
            hourly={weather.hourly}
            timeZone={location.timezone}
            count={12}
          />
        </section>
      )}

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-6">
        <DetailAqiCard aqi={aqi} />
        <DetailUvCard uvIndex={weather.current.uvIndex} />

        {/* 습도 카드 */}
        <div className="flex flex-col gap-1 rounded-[--radius-md] bg-card p-4">
          <span className="material-symbols-outlined text-[20px] text-muted-foreground">
            humidity_percentage
          </span>
          <p className="font-body text-xs text-muted-foreground">습도</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {weather.current.humidityPct != null
              ? `${weather.current.humidityPct}%`
              : '—'}
          </p>
        </div>

        {/* 이슬점 카드 */}
        <div className="flex flex-col gap-1 rounded-[--radius-md] bg-card p-4">
          <span className="material-symbols-outlined text-[20px] text-muted-foreground">
            dew_point
          </span>
          <p className="font-body text-xs text-muted-foreground">이슬점</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {weather.current.dewPointC != null
              ? `${Math.round(weather.current.dewPointC)}°`
              : '—'}
          </p>
        </div>
      </div>
    </main>
  );
}
