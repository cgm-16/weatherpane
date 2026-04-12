// useDetailBootstrap으로 상세 페이지 렌더링을 조율합니다.
import { useEffect, useRef } from 'react';
import { useWeatherRefresh } from '~/features/weather-queries/use-weather-refresh';
import { useDetailBootstrap } from '~/features/app-bootstrap/use-detail-bootstrap';
import { persistRecent } from '~/features/recents';
import { DetailDashboard } from './detail-dashboard';
import { LocationUnsupported } from './location-unsupported';
import { LocationNotFound } from './location-not-found';
import { LocationConnectionError } from './location-connection-error';
import { LastUpdated } from '~/shared/ui/last-updated';

interface LocationPageProps {
  resolvedLocationId: string;
}

export function LocationPage({ resolvedLocationId }: LocationPageProps) {
  const bootstrap = useDetailBootstrap(resolvedLocationId);
  const refresh = useWeatherRefresh();

  // Detail 진입 시 최근 지역에 추가 (data 또는 stale-fallback 상태에서만, 위치당 한 번)
  const addedLocationRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      (bootstrap.kind === 'data' || bootstrap.kind === 'stale-fallback') &&
      addedLocationRef.current !== bootstrap.location.locationId
    ) {
      addedLocationRef.current = bootstrap.location.locationId;
      persistRecent(bootstrap.location);
    }
  });

  if (bootstrap.kind === 'unsupported') {
    return <LocationUnsupported />;
  }

  if (bootstrap.kind === 'not-found') {
    return <LocationNotFound />;
  }

  if (bootstrap.kind === 'loading') {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background"
        role="main"
      >
        <p className="font-body text-muted-foreground">
          날씨 정보를 불러오는 중...
        </p>
      </main>
    );
  }

  if (bootstrap.kind === 'recoverable-error') {
    return (
      <LocationConnectionError
        onRetry={() => refresh(bootstrap.location.locationId)}
      />
    );
  }

  if (bootstrap.kind === 'stale-fallback') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background"
        role="main"
      >
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-border" />
          <span className="font-headline text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            오프라인 상태
          </span>
        </div>
        <p className="font-display text-5xl font-extrabold text-foreground">
          {Math.round(bootstrap.weather.temperatureC)}°C
        </p>
        <p className="font-body text-muted-foreground">
          {bootstrap.weather.conditionText}
        </p>
        <div className="flex gap-4">
          <span className="font-body text-sm text-muted-foreground">
            H {Math.round(bootstrap.weather.todayMaxC)}°
          </span>
          <span className="font-body text-sm text-muted-foreground">
            L {Math.round(bootstrap.weather.todayMinC)}°
          </span>
        </div>
        <LastUpdated
          fetchedAt={bootstrap.weather.fetchedAt}
          timezone={bootstrap.location.timezone}
        />
      </main>
    );
  }

  // 모든 오류 분기를 소진한 경우 bootstrap.kind === 'data'
  return (
    <DetailDashboard
      location={bootstrap.location}
      weather={bootstrap.weather}
      aqi={bootstrap.aqi}
      isRefreshing={bootstrap.isRefreshing}
      hasRefreshError={bootstrap.hasRefreshError}
      onRefresh={() => refresh(bootstrap.location.locationId)}
    />
  );
}
