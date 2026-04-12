// useHomeBootstrap으로 홈 페이지 렌더링을 조율합니다.
import { useQueryClient } from '@tanstack/react-query';
import { useHomeBootstrap } from '~/features/app-bootstrap/use-home-bootstrap';
import { weatherQueryKeys } from '~/features/weather-queries/query-keys';
import { HomeNoLocation } from './home-no-location';
import { HomeConnectionError } from './home-connection-error';
import { HomeConfigError } from './home-config-error';

export function HomePage() {
  const bootstrap = useHomeBootstrap();
  const queryClient = useQueryClient();

  if (bootstrap.kind === 'no-location') {
    return <HomeNoLocation />;
  }

  if (bootstrap.kind === 'config-error') {
    return <HomeConfigError error={bootstrap.error} />;
  }

  if (bootstrap.kind === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" role="main">
        <p className="font-body text-on-surface-variant">날씨 정보를 불러오는 중...</p>
      </main>
    );
  }

  if (bootstrap.kind === 'recoverable-error') {
    return (
      <HomeConnectionError
        onRetry={() => {
          const locationId = bootstrap.location.locationId;
          void queryClient.invalidateQueries({ queryKey: weatherQueryKeys.coreWeather(locationId) });
          void queryClient.invalidateQueries({ queryKey: weatherQueryKeys.aqi(locationId) });
        }}
      />
    );
  }

  if (bootstrap.kind === 'stale-fallback') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background" role="main">
        {/* 오프라인 표시 */}
        <div className="flex items-center gap-2 rounded-full bg-surface-container-high/40 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-outline-variant" />
          <span className="font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Offline Mode Active
          </span>
        </div>
        {/* 최소 날씨 표시 — T12(Home compact dashboard)에서 확장 예정 */}
        <p className="font-headline text-5xl font-extrabold text-on-surface">
          {bootstrap.weather.temperatureC}°C
        </p>
        <p className="font-body text-on-surface-variant">{bootstrap.weather.conditionText}</p>
      </main>
    );
  }

  // bootstrap.kind === 'data' — T12에서 실제 dashboard로 교체 예정
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background" role="main">
      <p className="font-headline text-5xl font-extrabold text-on-surface">
        {bootstrap.weather.current.temperatureC}°C
      </p>
      <p className="font-body text-on-surface-variant">
        {bootstrap.weather.current.condition.text}
      </p>
      <p className="font-label text-sm text-on-surface-variant">
        AQI: {bootstrap.aqi.summary.category}
      </p>
    </main>
  );
}
