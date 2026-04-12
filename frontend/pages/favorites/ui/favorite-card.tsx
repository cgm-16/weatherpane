import { useNavigate } from 'react-router';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { CORE_WEATHER_STALE_TIME } from '~/features/weather-queries/weather-query-options';
import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import type { FavoriteLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';

const VERY_STALE_MS = 60 * 60_000;

type Staleness = 'fresh' | 'stale' | 'very-stale';

function getStaleness(fetchedAt: string): Staleness {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  if (ageMs > VERY_STALE_MS) return 'very-stale';
  if (ageMs > CORE_WEATHER_STALE_TIME) return 'stale';
  return 'fresh';
}

function CardSkeleton() {
  return (
    <div
      data-testid="card-skeleton"
      className="h-44 animate-pulse rounded-[--radius-md] bg-card p-6"
    >
      <div className="mb-4 h-6 w-1/2 rounded-full bg-muted" />
      <div className="mb-2 h-12 w-1/3 rounded-full bg-muted" />
      <div className="flex gap-2">
        <div className="h-6 w-14 rounded-full bg-muted" />
        <div className="h-6 w-14 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function CardError({
  isOffline,
  onRetry,
}: {
  isOffline: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-[--radius-md] bg-card p-6 text-center">
      <span className="material-symbols-outlined text-3xl text-muted-foreground opacity-50">
        {isOffline ? 'wifi_off' : 'cloud_off'}
      </span>
      <p className="font-body text-sm text-muted-foreground">
        {isOffline ? '오프라인 상태입니다' : '날씨 정보를 불러오지 못했습니다'}
      </p>
      {!isOffline && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-muted px-4 py-1.5 font-body text-xs font-semibold text-foreground"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function StaleIndicator({ staleness }: { staleness: Staleness }) {
  if (staleness === 'fresh') return null;
  return (
    <span className="font-body text-[10px] font-medium text-muted-foreground opacity-70">
      {staleness === 'very-stale' ? '매우 오래된 정보' : '오래된 정보'}
    </span>
  );
}

function CardSnapshot({
  favorite,
  weather,
  hasRefreshError,
  onCardClick,
}: {
  favorite: FavoriteLocation;
  weather: CoreWeather;
  hasRefreshError: boolean;
  onCardClick: () => void;
}) {
  const staleness = getStaleness(weather.fetchedAt);
  // 갱신 실패 시 데이터가 신선해도 최소 'stale'로 표시
  const effectiveStaleness =
    hasRefreshError && staleness === 'fresh' ? 'stale' : staleness;
  const displayName = favorite.nickname ?? favorite.location.name;

  return (
    <article
      role="article"
      tabIndex={0}
      aria-label={`${displayName} 날씨 보기`}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick();
        }
      }}
      className="group relative flex h-44 cursor-pointer flex-col justify-between overflow-hidden rounded-[--radius-md] bg-card p-6 transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-headline text-xl leading-tight font-bold text-card-foreground">
            {displayName}
          </h3>
          {favorite.nickname && (
            <p className="font-body text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {favorite.location.name}
            </p>
          )}
        </div>
        {(hasRefreshError || staleness !== 'fresh') && (
          <StaleIndicator staleness={effectiveStaleness} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-headline text-5xl leading-none font-extrabold text-card-foreground">
          {Math.round(weather.current.temperatureC)}°
        </span>
        <div className="flex items-center gap-2">
          <span className="font-body text-xs font-medium text-muted-foreground">
            {weather.current.condition.text}
          </span>
          <div className="ml-auto flex gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
              <span className="text-muted-foreground">H</span>
              <span>{Math.round(weather.today.maxC)}°</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
              <span className="text-muted-foreground">L</span>
              <span>{Math.round(weather.today.minC)}°</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

interface FavoriteCardProps {
  favorite: FavoriteLocation;
}

export function FavoriteCard({ favorite }: FavoriteCardProps) {
  const navigate = useNavigate();
  const { setActiveLocation } = useActiveLocation();
  const weatherQuery = useCoreWeather(favorite.location);
  const isOffline = !navigator.onLine;

  function handleCardClick() {
    setActiveLocation({
      kind: 'resolved',
      location: favorite.location,
      source: 'favorite',
      changedAt: new Date().toISOString(),
    });
    navigate(`/location/${favorite.location.locationId}`);
  }

  if (!weatherQuery.data) {
    if (weatherQuery.isLoading) return <CardSkeleton />;
    return (
      <CardError isOffline={isOffline} onRetry={() => weatherQuery.refetch()} />
    );
  }

  return (
    <CardSnapshot
      favorite={favorite}
      weather={weatherQuery.data}
      hasRefreshError={weatherQuery.isError}
      onCardClick={handleCardClick}
    />
  );
}
