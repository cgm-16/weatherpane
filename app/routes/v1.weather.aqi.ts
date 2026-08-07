import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';
import { applyProxyCacheControl } from '../../frontend/shared/api/proxy-cache-control';
import { roundCoordinate } from '../../frontend/shared/lib/round-coordinate';

// aqi 응답은 Vercel CDN에서 30분(1800초) 동안 공유 캐시한다.
const AQI_CACHE_S_MAXAGE = 1800;

// OpenWeather Air Pollution API 프록시.
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
      AQI_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/2.5/air_pollution'
  );
  // 좌표 정밀도를 2자리로 제한해 인접 좌표를 같은 CDN 캐시 키/업스트림 호출로 모은다.
  upstreamUrl.searchParams.set('lat', String(roundCoordinate(Number(lat))));
  upstreamUrl.searchParams.set('lon', String(roundCoordinate(Number(lon))));

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    'AQI API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, AQI_CACHE_S_MAXAGE);
}
