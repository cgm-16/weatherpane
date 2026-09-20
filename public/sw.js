// public/sw.js
// Weatherpane 서비스 워커 — 앱 셸/정적 에셋 런타임 캐시 (이슈 #78).
// 날씨 API(/v1/*)는 캐시하지 않는다 — 스냅샷 저장소가 "보여줘도 되는 데이터"의 유일한
// 판단 주체다. 파일명이 빌드마다 해시로 바뀌므로 사전 캐시 대신 런타임에 실제 URL로
// 캐시한다. 전용 오프라인 안내 문서만 설치 때 미리 저장한다.

const OFFLINE_URL = new URL('/offline.html', self.location.origin).href;
// ponytail: 항목 수만 제한한다. 에셋 크기가 커지면 바이트 예산 기반으로 확장한다.
const MAX_ASSET_ENTRIES = 200;

// 캐시 버전. 전략이나 대상이 바뀌면 숫자를 올린다. activate에서 이 목록에 없는
// weatherpane- 캐시는 삭제한다.
const APP_SHELL_CACHE = 'weatherpane-app-shell-v2';
const ASSET_CACHE = 'weatherpane-assets-v2';
const EXPECTED_CACHES = [APP_SHELL_CACHE, ASSET_CACHE];

// 설치: skipWaiting을 호출하지 않는다. 새 워커는 대기 상태로 두었다가 기존 탭이 모두
// 사라진 뒤 다음 내비게이션에서 제어권을 넘겨받는다. 이렇게 해야 새 HTML을 옛 캐시된
// 청크와 섞어 내보내는 사고를 피한다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(OFFLINE_URL, { cache: 'reload' });
      if (response.status !== 200) throw new Error('오프라인 문서 설치 실패');
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put(OFFLINE_URL, response);
    })()
  );
});

// Cache.keys()의 삽입 순서를 사용해 가장 오래 저장된 에셋부터 제거한다.
async function trimAssetCache(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(
    0,
    Math.max(0, keys.length - MAX_ASSET_ENTRIES)
  )) {
    await cache.delete(key);
  }
}

async function storeResponse(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (cacheName === ASSET_CACHE) await trimAssetCache(cache);
}

// 같은 종류의 이전 캐시는 높은 버전부터 읽어 현재 캐시에 없는 항목만 옮긴다. 새 워커가
// 활성화되기 전에 이전 버전의 런타임 캐시를 비워 오프라인 폴백을 잃지 않게 한다.
// 현재보다 높은 버전도 일부러 포함한다. 배포를 되돌리면 활성화 마지막 단계가 어차피
// EXPECTED_CACHES 밖의 캐시를 전부 지우므로, 옮기지 않으면 사용자는 오프라인 폴백만
// 잃는다. 에셋은 내용 해시 URL이라 버전이 달라도 같은 URL은 같은 바이트이고, 문서는
// 네트워크 우선이라 온라인에서 항상 최신으로 덮어쓴다.
// 캐시에 담는 값의 의미 자체가 바뀌는 변경이라면 버전 숫자가 아니라 접두사를 바꿔야
// 한다. 그래야 이 이관 경로를 타지 않는다.
function previousCacheNames(names, currentCache) {
  const prefix = currentCache.replace(/\d+$/, '');
  return names
    .map((name) => {
      const match = name.match(new RegExp(`^${prefix}(\\d+)$`));
      return match && name !== currentCache
        ? { name, version: Number(match[1]) }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.version - left.version)
    .map(({ name }) => name);
}

// maxEntries가 있으면 원본에서 가장 최근 항목만 읽는다. 상한 없는 이전 버전 캐시를
// 통째로 복제한 뒤 트림하면 그 사이 저장 쿼터를 넘겨 이관이 실패할 수 있는데, 어차피
// 트림으로 지울 오래된 항목이므로 처음부터 옮기지 않는다.
async function migrateCacheEntries(sourceName, targetName, maxEntries) {
  const source = await caches.open(sourceName);
  const target = await caches.open(targetName);
  const keys = await source.keys();
  const requests = maxEntries ? keys.slice(-maxEntries) : keys;

  for (const request of requests) {
    if (await target.match(request)) continue;
    const response = await source.match(request);
    if (response) await target.put(request, response.clone());
  }
}

// 활성화: 이전 앱 셸/에셋 캐시를 이관하고 에셋 상한을 적용한 뒤 오래된
// weatherpane- 캐시를 정리하고, 열려 있는 클라이언트의 제어권을 가져온다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      for (const name of previousCacheNames(names, APP_SHELL_CACHE)) {
        await migrateCacheEntries(name, APP_SHELL_CACHE);
      }
      for (const name of previousCacheNames(names, ASSET_CACHE)) {
        await migrateCacheEntries(name, ASSET_CACHE, MAX_ASSET_ENTRIES);
      }
      await trimAssetCache(await caches.open(ASSET_CACHE));
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
// 정적 에셋(해시된 /assets/*)에 쓴다.
async function cacheFirst(event, cacheName, request) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // CacheStorage 읽기 실패는 네트워크 요청을 막지 않는다.
  }
  const response = await fetch(request);
  // 동일 출처 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). 교차 출처
  // (opaque) 응답 — 예: 향후 원격 매니페스트 override URL — 은 매번 새로 받고 오프라인
  // 캐시에 넣지 않는다. opaque 응답은 status가 0이라 교차 출처 404를 성공과 구분할 수
  // 없어, 영구 캐시에 넣으면 안 되기 때문이다.
  // waitUntil로 워커 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
  if (response && response.status === 200) {
    // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
    // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
    try {
      // 응답 본문이 반환 과정에서 소비되기 전에 캐시용 복제본을 만든다.
      const responseForCache = response.clone();
      event.waitUntil(
        storeResponse(cacheName, request, responseForCache).catch(() => {})
      );
    } catch {
      // 캐시 쓰기 준비 실패도 네트워크 응답을 막지 않는다.
    }
  }
  return response;
}

// 네트워크 우선: 네트워크가 되면 최신 응답으로 캐시를 갱신해 반환하고, 실패하면 같은
// URL의 캐시된 응답으로 폴백한다. 내비게이션(HTML 문서)에 써서, 오프라인에서 "이전에
// 열었던 페이지 새로고침" 시 앱 셸을, 미방문 URL에는 전용 안내 문서를 보여준다.
async function networkFirst(event, cacheName, request) {
  try {
    const response = await fetch(request);
    // 200 응답만 캐시한다(206 등은 cache.put이 던지므로 제외). waitUntil로 워커
    // 수명을 늘려 응답 반환 후에도 쓰기가 끝나도록 보장한다.
    if (response && response.status === 200) {
      // 캐시 쓰기는 best-effort다. QuotaExceededError 등으로 실패해도 삼켜서
      // unhandled rejection이 새지 않게 한다(응답은 이미 반환됨).
      try {
        // 응답 본문이 반환 과정에서 소비되기 전에 캐시용 복제본을 만든다.
        const responseForCache = response.clone();
        event.waitUntil(
          storeResponse(cacheName, request, responseForCache).catch(() => {})
        );
      } catch {
        // 캐시 쓰기 준비 실패도 네트워크 응답을 막지 않는다.
      }
    }
    return response;
  } catch (error) {
    try {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
      // 다른 라우트의 SSR 문서를 반환하면 하이드레이션이 어긋난다.
      if (request.mode === 'navigate') {
        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
      }
    } catch {
      // CacheStorage 오류 대신 원래 네트워크 오류를 아래에서 다시 던진다.
    }
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

  // 동일 출처 정적 에셋(해시된 JS/CSS/폰트).
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, request));
    return;
  }

  // 동일 출처 스케치 등 webp 에셋: 네트워크 우선. 고정 URL도 새 번들을 배포할 때 최신
  // 그림으로 갱신하고, 오프라인에서는 이전 캐시로 폴백한다. 교차 출처 webp(예: 향후 원격
  // 매니페스트 override)는 이 분기를 타지 않고 브라우저 기본 fetch로 넘어가 ASSET_CACHE에
  // 들어가지 않는다 — 오프라인 에셋 캐시는 위 /assets/ 분기와 동일하게 동일 출처만
  // 대상으로 한다.
  if (url.origin === self.location.origin && url.pathname.endsWith('.webp')) {
    event.respondWith(networkFirst(event, ASSET_CACHE, request));
    return;
  }

  // 내비게이션(HTML 문서): 네트워크 → 같은 URL 캐시 → 전용 오프라인 문서.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, APP_SHELL_CACHE, request));
    return;
  }
});
