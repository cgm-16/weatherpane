import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';

// OpenWeather Geocoding API 프록시.
export async function loader({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q) {
    return Response.json(
      {
        code: 'INVALID_PROVIDER_RESPONSE',
        message: 'q 파라미터가 필요합니다.',
      },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL('https://api.openweathermap.org/geo/1.0/direct');
  upstreamUrl.searchParams.set('q', q);
  upstreamUrl.searchParams.set('limit', '5');

  return proxyOpenWeatherRequest(
    upstreamUrl,
    '지오코딩 API 네트워크 오류가 발생했습니다'
  );
}
