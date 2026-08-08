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

  // 공백·비수치·범위 밖 좌표는 업스트림 호출 이전에 거부한다(쿼터를 낭비하지 않는다).
  // 공백뿐인 값은 Number()가 0으로 강제 변환하므로 유한성 검사 이전에 걸러낸다.
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (
    !lat.trim() ||
    !lon.trim() ||
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
      AQI_CACHE_S_MAXAGE
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/2.5/air_pollution'
  );
  // 업스트림에 보내는 좌표 정밀도를 2자리로 제한한다. CDN 캐시 키는 들어온 요청 URL 기준이라 서버측 반올림으로는 합쳐지지 않는다(키 정규화는 클라이언트측 반올림 담당).
  upstreamUrl.searchParams.set('lat', String(roundCoordinate(latNum)));
  upstreamUrl.searchParams.set('lon', String(roundCoordinate(lonNum)));

  const response = await proxyOpenWeatherRequest(
    upstreamUrl,
    'AQI API 네트워크 오류가 발생했습니다'
  );
  return applyProxyCacheControl(response, AQI_CACHE_S_MAXAGE);
}
