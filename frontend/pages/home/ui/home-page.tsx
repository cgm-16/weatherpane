// useHomeBootstrap으로 홈 페이지 렌더링을 조율합니다.
import { useWeatherRefresh } from '~/features/weather-queries/use-weather-refresh';
import { useHomeBootstrap } from '~/features/app-bootstrap/use-home-bootstrap';
import { HomeDashboard } from './home-dashboard';
import { HomeNoLocation } from './home-no-location';
import { HomeConnectionError } from './home-connection-error';
import { HomeConfigError } from './home-config-error';
import { HomeLastUpdated } from './home-last-updated';

export function HomePage() {
  const bootstrap = useHomeBootstrap();
  const refresh = useWeatherRefresh();

  if (bootstrap.kind === 'no-location') {
    return <HomeNoLocation />;
  }

  if (bootstrap.kind === 'config-error') {
    return <HomeConfigError error={bootstrap.error} />;
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
      <HomeConnectionError
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
        {/* 오프라인 표시 */}
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-border" />
          <span className="font-display text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            오프라인 상태
          </span>
        </div>
        {/* 최소 날씨 표시 */}
        <p className="font-display text-5xl font-extrabold text-foreground">
          {bootstrap.weather.temperatureC}°C
        </p>
        <p className="font-body text-muted-foreground">
          {bootstrap.weather.conditionText}
        </p>
        <div className="flex gap-4">
          <span className="font-body text-sm text-muted-foreground">
            H {bootstrap.weather.todayMaxC}°
          </span>
          <span className="font-body text-sm text-muted-foreground">
            L {bootstrap.weather.todayMinC}°
          </span>
        </div>
        <HomeLastUpdated
          fetchedAt={bootstrap.weather.fetchedAt}
          timezone={bootstrap.location.timezone}
        />
      </main>
    );
  }

  // bootstrap.kind === 'data'
  return (
    <HomeDashboard
      location={bootstrap.location}
      weather={bootstrap.weather}
      aqi={bootstrap.aqi}
      isRefreshing={bootstrap.isRefreshing}
      hasRefreshError={bootstrap.hasRefreshError}
      onRefresh={() => refresh(bootstrap.location.locationId)}
    />
  );
}
