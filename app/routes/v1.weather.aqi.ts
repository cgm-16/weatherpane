import { proxyOpenWeatherRequest } from '../../frontend/shared/api/openweather-proxy.server';

// OpenWeather Air Pollution API 프록시.
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
    'https://api.openweathermap.org/data/2.5/air_pollution'
  );
  upstreamUrl.searchParams.set('lat', lat);
  upstreamUrl.searchParams.set('lon', lon);

  return proxyOpenWeatherRequest(
    upstreamUrl,
    'AQI API 네트워크 오류가 발생했습니다'
  );
}
