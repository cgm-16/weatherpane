import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';
import { applyProxyCacheControl } from '../../frontend/shared/api/proxy-cache-control';

// geocode 응답(도시명→좌표)은 거의 불변이므로 Vercel CDN에서 24시간(86400초) 공유 캐시한다.
const GEOCODE_CACHE_S_MAXAGE = 86400;

// OpenWeather Geocoding API 프록시.
export async function loader({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q) {
    return applyProxyCacheControl(
      Response.json(
        {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'q 파라미터가 필요합니다.',
        },
        { status: 400 }
      ),
      GEOCODE_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL('https://api.openweathermap.org/geo/1.0/direct');
  upstreamUrl.searchParams.set('q', q);
  upstreamUrl.searchParams.set('limit', '5');

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    '지오코딩 API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, GEOCODE_CACHE_S_MAXAGE);
}
