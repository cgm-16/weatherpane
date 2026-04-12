import { Link } from 'react-router';
import { useFavorites, FavoriteUndoToast } from '~/features/favorites';
import { persistRecent } from '~/features/recents';
import { HourlyStrip } from '~/shared/ui/hourly-strip';
import type {
  ResolvedLocation,
  RawGpsFallbackLocation,
} from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';
import type { Aqi } from '~/entities/aqi/model/aqi';

interface HomeDashboardProps {
  location: ResolvedLocation | RawGpsFallbackLocation;
  weather: CoreWeather;
  aqi: Aqi;
  isRefreshing: boolean;
  hasRefreshError: boolean;
  onRefresh: () => void;
}

const aqiCategoryLabel: Record<string, string> = {
  good: '좋음',
  fair: '보통',
  moderate: '민감군 나쁨',
  poor: '나쁨',
  'very-poor': '매우 나쁨',
};

export function HomeDashboard({
  location,
  weather,
  aqi,
  isRefreshing,
  hasRefreshError,
  onRefresh,
}: HomeDashboardProps) {
  const {
    isFavorite,
    addFavorite,
    removeFavorite,
    undoEntry,
    undoRemove,
    atMaxFavorites,
  } = useFavorites();
  const canFavorite = location.kind === 'resolved';
  const favorited = canFavorite && isFavorite(location.locationId);
  const clampedAqi = Math.min(5, Math.max(1, aqi.summary.aqi));

  return (
    <main className="flex min-h-screen flex-col bg-background" role="main">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-bold text-foreground">
          {location.name}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="새로고침"
            disabled={isRefreshing}
            onClick={() => {
              if (location.kind === 'resolved') persistRecent(location);
              onRefresh();
            }}
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
            disabled={!canFavorite || (!favorited && atMaxFavorites)}
            onClick={() => {
              if (!canFavorite) return;
              if (location.kind === 'resolved') persistRecent(location);
              if (favorited) {
                removeFavorite(location.locationId);
              } else {
                addFavorite(location);
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[22px]">
              {favorited ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>
      </header>

      {/* raw-GPS 위치는 즐겨찾기 불가 안내 */}
      {!canFavorite && (
        <p className="px-4 pt-1 font-body text-xs text-muted-foreground">
          지원되지 않는 위치입니다. 즐겨찾기에 추가할 수 없습니다.
        </p>
      )}

      {/* 비차단 새로고침 오류 */}
      {hasRefreshError && (
        <div
          role="alert"
          className="mx-4 rounded-[--radius-sm] bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          새로고침에 실패했습니다. 이전 날씨 정보를 표시합니다.
        </div>
      )}

      {/* 메인 요약 카드 — 탭 시 상세 페이지로 이동 */}
      <Link
        to={canFavorite ? `/location/${location.catalogLocationId}` : ''}
        className="mx-4 mt-3 flex flex-col items-center gap-2 rounded-[--radius-md] bg-card px-6 py-8"
        aria-label={`${location.name}: ${Math.round(weather.current.temperatureC)}° ${weather.current.condition.text}, 날씨 상세 보기`}
      >
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
        <span className="mt-2 rounded-full bg-primary px-4 py-1 font-body text-sm font-semibold text-primary-foreground">
          상세 보기
        </span>
      </Link>

      {/* 6시간 시간별 미리보기 — resolved 위치만 timezone을 가짐 */}
      {canFavorite && weather.hourly.length > 0 && (
        <section className="px-4 pt-4">
          <HourlyStrip hourly={weather.hourly} timeZone={location.timezone} />
        </section>
      )}

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-6">
        {/* AQI 카드 */}
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
          {/* AQI는 유럽 1–5 순위 척도를 가정합니다 (1=좋음, 5=매우 나쁨). */}
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${((clampedAqi - 1) / 4) * 100}%`,
              }}
            />
          </div>
        </div>

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
      </div>

      {undoEntry && (
        <FavoriteUndoToast
          locationName={
            undoEntry.removedItem.nickname ??
            undoEntry.removedItem.location.name
          }
          onUndo={undoRemove}
        />
      )}
    </main>
  );
}
