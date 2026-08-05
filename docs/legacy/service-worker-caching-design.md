---
archived_on: 2026-07-30
archive_reason: 서비스 워커가 구현된 적이 없다. Home/Detail 오프라인 UX는 영속 스냅샷 fallback과 online/offline 이벤트 수준까지만 구현되어 있고, Favorites 날씨 데이터는 세션 내 인메모리 캐시만 사용한다. 앱 셸 precache/런타임 캐시 같은 PWA 수준 지원은 없다 (docs/weatherpane-retrospective.md 참고).
replaced_by: 미구현 — 차기 범위. 실제 구현되면 새 이슈와 함께 docs/specs.md에 반영한다.
---

# 서비스워커 캐싱 전략 설계 (아카이브)

이 문서는 `docs/specs.md`의 "서비스워커 캐싱 전략" 절에 있던 캐시 분류·전략 매핑·fetch 핸들러 의사코드를 원문 그대로 보존한 것이다. 실제 구현에서는 서비스 워커가 만들어진 적이 없다. Home/Detail 날씨 흐름은 영속 스냅샷 fallback(`frontend/features/app-bootstrap/`)과 브라우저 online/offline 이벤트 수준까지만 구현되어 있다. 반면 Favorites 카드는 별도 영속 날씨 스냅샷 없이 `useCoreWeather()`의 세션 내 TanStack Query 데이터만 사용하므로, 앱 재시작 직후 오프라인 상태에서는 이전 날씨를 표시하지 못한다(`frontend/pages/favorites/ui/favorite-card.tsx`). 앱 셸 precache, 런타임 캐시, CacheStorage 기반 정적 에셋 캐싱 같은 PWA 수준의 오프라인 지원은 아직 없다. 아래 내용은 변경 없이 원문 그대로 옮긴 것이며, 현재 시점에서 사실이 아니다 — 미래에 서비스 워커를 도입할 때 참고용으로만 남긴다.

---

## 서비스워커 캐싱 전략

MDN은 PWA 캐싱의 주요 기술로 Fetch API, Service Worker API, Cache API를 제시한다. citeturn0search3turn5search1  
CacheStorage/Cache는 오프라인 에셋 저장과 사용자화 응답을 가능하게 한다. citeturn5search0turn5search4

### 캐시 분류(권장)

- `cache-app-shell-vX`: HTML/CSS/JS 번들(precaching)
- `cache-assets-vX`: 스케치/아이콘/폰트(정적)
- `cache-http-vX`: GET API 응답(선택; 스냅샷이 주 저장소이므로 보조)

### 전략 매핑

| 리소스             | 전략                                    | 이유                       |
| ------------------ | --------------------------------------- | -------------------------- |
| App shell          | Cache-first + 업데이트 시 새 버전       | 즉시 로딩                  |
| Sketch assets      | Cache-first(버전 해시 파일)             | 리소스 안정                |
| Locations metadata | Stale-while-revalidate(선택)            | 사용자 체감 속도           |
| Weather GET        | Network-first + 실패 시 스냅샷 fallback | 최신성 우선, 오프라인 대응 |
| Manifest           | Network-first + 캐시                    | 운영 중 교체 가능          |

Workbox 문서는 stale-while-revalidate 패턴(캐시 즉시 응답 + 네트워크로 갱신)을 설명한다. citeturn5search3  
단, Weatherpane는 API 응답의 “신뢰 가능한 영속 상태”를 명시적 버전드 스냅샷 저장소에 두므로 Cache API는 보조로 제한한다.

## 서비스워커 fetch 핸들러 의사코드

```ts
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) App shell / static assets
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.webp')) {
      event.respondWith(cacheFirst('cache-assets-v3', req));
      return;
    }
    // navigation requests
    if (req.mode === 'navigate') {
      event.respondWith(
        networkFirstWithFallbackToCache('cache-app-shell-v3', req)
      );
      return;
    }
  }

  // 2) API calls (GET only)
  if (url.pathname.startsWith('/v1/') && req.method === 'GET') {
    // Prefer network, fall back to cache; UI will fall back to persisted snapshots anyway
    event.respondWith(networkFirstWithFallbackToCache('cache-http-v3', req));
    return;
  }
});
```
