// 프록시 성공 응답만 Vercel CDN이 공유 캐시하도록 s-maxage를 설정한다.
// 브라우저 신선도는 TanStack Query staleTime이 관리하므로 max-age=0으로 둔다.
// 오류 응답은 절대 캐시하지 않는다(no-store).
export function applyProxyCacheControl(
  response: Response,
  sMaxAgeSeconds: number
): Response {
  if (response.ok) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds}`
    );
  } else {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}
