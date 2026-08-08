// public/sw.js
// Weatherpane 서비스 워커 — 앱 셸/정적 에셋 런타임 캐시 (이슈 #78).
// 날씨 API(/v1/*)는 캐시하지 않는다 — 스냅샷 저장소가 "보여줘도 되는 데이터"의 유일한
// 판단 주체다. 파일명이 빌드마다 해시로 바뀌므로 사전 캐시 대신 런타임에 실제 URL로
// 캐시한다.

// 캐시 버전. 전략이나 대상이 바뀌면 숫자를 올린다. activate에서 이 목록에 없는
// weatherpane- 캐시는 삭제한다.
const APP_SHELL_CACHE = 'weatherpane-app-shell-v1';
const ASSET_CACHE = 'weatherpane-assets-v1';
const EXPECTED_CACHES = [APP_SHELL_CACHE, ASSET_CACHE];

// 설치: skipWaiting을 호출하지 않는다. 새 워커는 대기 상태로 두었다가 기존 탭이 모두
// 사라진 뒤 다음 내비게이션에서 제어권을 넘겨받는다. 이렇게 해야 새 HTML을 옛 캐시된
// 청크와 섞어 내보내는 사고를 피한다.
self.addEventListener('install', () => {});

// 활성화: 이 버전 집합에 없는 오래된 weatherpane- 캐시를 정리하고, 열려 있는 클라이언트의
// 제어권을 가져온다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith('weatherpane-') && !EXPECTED_CACHES.includes(name)
          )
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// 캐시 우선: 캐시에 있으면 그대로, 없으면 네트워크로 받아 캐시에 넣는다. 내용이 안정적인
// 정적 에셋(해시된 /assets/*, 스케치 *.webp)에 쓴다.
async function cacheFirst(event, cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // 동일 출처 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). 교차 출처
  // (opaque) 응답 — 예: 향후 원격 매니페스트 override URL — 은 매번 새로 받고 오프라인
  // 캐시에 넣지 않는다. opaque 응답은 status가 0이라 교차 출처 404를 성공과 구분할 수
  // 없어, 영구 캐시에 넣으면 안 되기 때문이다.
  // waitUntil로 워커 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
  if (response && response.status === 200) {
    // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
    // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
    event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
  }
  return response;
}

// 네트워크 우선: 네트워크가 되면 최신 응답으로 캐시를 갱신해 반환하고, 실패하면 같은
// URL의 캐시된 응답으로 폴백한다. 내비게이션(HTML 문서)에 써서, 오프라인에서 "이전에
// 열었던 페이지 새로고침" 시 앱 셸이 뜨게 한다.
async function networkFirst(event, cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). waitUntil로 워커
    // 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
    if (response && response.status === 200) {
      // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
      // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 날씨/지오코드/매니페스트 등 API는 서비스 워커가 건드리지 않는다.
  if (url.origin === self.location.origin && url.pathname.startsWith('/v1/')) {
    return;
  }

  // 동일 출처 스케치 등 webp 에셋: 캐시 우선. 교차 출처 webp(예: 향후 원격 매니페스트
  // override)는 이 분기를 타지 않고 브라우저 기본 fetch로 넘어가 ASSET_CACHE에 들어가지
  // 않는다 — 오프라인 에셋 캐시는 아래 /assets/ 분기와 동일하게 동일 출처만 대상으로 한다.
  if (url.origin === self.location.origin && url.pathname.endsWith('.webp')) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, request));
    return;
  }

  // 동일 출처 정적 에셋(해시된 JS/CSS/폰트).
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, request));
    return;
  }

  // 내비게이션(HTML 문서): 네트워크 우선 + 같은 URL 캐시 폴백.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, APP_SHELL_CACHE, request));
    return;
  }
});
