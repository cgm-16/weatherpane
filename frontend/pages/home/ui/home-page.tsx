// useHomeBootstrap으로 홈 페이지 렌더링을 조율합니다.
import { useWeatherRefresh } from '~/features/weather-queries/use-weather-refresh';
import { useHomeBootstrap } from '~/features/app-bootstrap/use-home-bootstrap';
import { HomeDashboard } from './home-dashboard';
import { HomeNoLocation } from './home-no-location';
import { HomeConnectionError } from './home-connection-error';
import { HomeConfigError } from './home-config-error';
import { LastUpdated } from '~/shared/ui/last-updated';
import { useSettings } from '~/features/settings';
import { formatTemperature } from '~/shared/lib/temperature';

export function HomePage() {
  const bootstrap = useHomeBootstrap();
  const refresh = useWeatherRefresh();
  const { temperatureUnit } = useSettings();

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
        {/* 최소 날씨 표시 */}
        <p className="font-display text-5xl font-extrabold text-foreground">
          {formatTemperature(bootstrap.weather.temperatureC, temperatureUnit)}
        </p>
        <p className="font-body text-muted-foreground">
          {bootstrap.weather.conditionText}
        </p>
        <div className="flex gap-4">
          <span className="font-body text-sm text-muted-foreground">
            H {formatTemperature(bootstrap.weather.todayMaxC, temperatureUnit)}
          </span>
          <span className="font-body text-sm text-muted-foreground">
            L {formatTemperature(bootstrap.weather.todayMinC, temperatureUnit)}
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
    <HomeDashboard
      location={bootstrap.location}
      weather={bootstrap.weather}
      aqi={bootstrap.aqi}
      isRefreshing={bootstrap.isRefreshing}
      hasRefreshError={bootstrap.hasRefreshError}
      onRefresh={() => refresh(bootstrap.location.locationId)}
      temperatureUnit={temperatureUnit}
    />
  );
}
