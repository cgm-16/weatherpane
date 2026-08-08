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

  // 비수치·범위 밖 좌표는 업스트림 호출 이전에 거부한다(쿼터를 낭비하지 않는다).
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (
    !Number.isFinite(latNum) ||
    !Number.isFinite(lonNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lonNum < -180 ||
    lonNum > 180
  ) {
    return applyProxyCacheControl(
      Response.json(
        {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: 'lat, lon 값이 유효한 좌표가 아닙니다.',
        },
        { status: 400 }
      ),
      CORE_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/3.0/onecall'
  );
  // 업스트림에 보내는 좌표 정밀도를 2자리로 제한한다. CDN 캐시 키는 들어온 요청 URL 기준이라 서버측 반올림으로는 합쳐지지 않는다(키 정규화는 클라이언트측 반올림 담당).
  upstreamUrl.searchParams.set('lat', String(roundCoordinate(latNum)));
  upstreamUrl.searchParams.set('lon', String(roundCoordinate(lonNum)));
  upstreamUrl.searchParams.set('exclude', 'minutely,alerts');
  upstreamUrl.searchParams.set('units', 'metric');

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    '날씨 API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, CORE_CACHE_S_MAXAGE);
}
