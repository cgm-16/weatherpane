import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';
import { applyProxyCacheControl } from '../../frontend/shared/api/proxy-cache-control';
import { roundCoordinate } from '../../frontend/shared/lib/round-coordinate';

// core 응답은 Vercel CDN에서 10분(600초) 동안 공유 캐시한다.
const CORE_CACHE_S_MAXAGE = 600;

// OpenWeather One Call 3.0 프록시. 클라이언트는 이 엔드포인트만 호출하며
// API 키는 이 요청 경로 밖(openweather-proxy.server.ts)에서만 다뤄진다.
export async function loader({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) {
    return applyProxyCacheControl(
      Response.json(
        {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'lat, lon 파라미터가 필요합니다.',
        },
        { status: 400 }
      ),
      CORE_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/3.0/onecall'
  );
  // 좌표 정밀도를 2자리로 제한해 인접 좌표를 같은 CDN 캐시 키/업스트림 호출로 모은다.
  upstreamUrl.searchParams.set('lat', String(roundCoordinate(Number(lat))));
  upstreamUrl.searchParams.set('lon', String(roundCoordinate(Number(lon))));
  upstreamUrl.searchParams.set('exclude', 'minutely,alerts');
  upstreamUrl.searchParams.set('units', 'metric');

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    '날씨 API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, CORE_CACHE_S_MAXAGE);
}
