import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';

// OpenWeather One Call 3.0 프록시. 클라이언트는 이 엔드포인트만 호출하며
// API 키는 이 요청 경로 밖(openweather-proxy.server.ts)에서만 다뤄진다.
export async function loader({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) {
    return Response.json(
      {
        code: 'INVALID_PROVIDER_RESPONSE',
        message: 'lat, lon 파라미터가 필요합니다.',
      },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL(
    'https://api.openweathermap.org/data/3.0/onecall'
  );
  upstreamUrl.searchParams.set('lat', lat);
  upstreamUrl.searchParams.set('lon', lon);
  upstreamUrl.searchParams.set('exclude', 'minutely,alerts');
  upstreamUrl.searchParams.set('units', 'metric');

  return proxyOpenWeatherRequest(
    upstreamUrl,
    '날씨 API 네트워크 오류가 발생했습니다'
  );
}
