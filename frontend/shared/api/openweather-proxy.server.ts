// OpenWeather 실제 API 키를 다루는 서버 전용 헬퍼.
// 파일명의 .server.ts 접미사 때문에 클라이언트 코드에서 이 파일을 import하면
// React Router Vite 플러그인이 빌드를 실패시킨다
// ("Server-only module referenced by client").
// 저장소 전체에서 OPENWEATHER_API_KEY를 읽는 유일한 지점이다.

export async function proxyOpenWeatherRequest(
  upstreamUrl: URL,
  errorMessage: string
): Promise<Response> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: 'PROVIDER_NOT_IMPLEMENTED',
        message: 'OPENWEATHER_API_KEY가 설정되지 않았습니다.',
      },
      { status: 501 }
    );
  }

  // upstreamUrl은 호출자가 소유한 객체이므로 원본을 직접 변형하지 않는다.
  // 복제하지 않고 mutate하면 호출자가 이후 그 URL을 로깅하거나 재사용할 때
  // 이 함수의 반환값과 무관하게 키가 새어나간다.
  const requestUrl = new URL(upstreamUrl);
  requestUrl.searchParams.set('appid', apiKey);

  let response: Response;
  try {
    response = await fetch(requestUrl.toString());
  } catch {
    return Response.json(
      { code: 'INVALID_PROVIDER_RESPONSE', message: errorMessage },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return Response.json(
      {
        code: 'INVALID_PROVIDER_RESPONSE',
        message: `${errorMessage}: ${response.status}`,
      },
      { status: response.status }
    );
  }

  const data: unknown = await response.json();
  return Response.json(data);
}
