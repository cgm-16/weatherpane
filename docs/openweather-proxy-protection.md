# OpenWeather 프록시 보호 운영 문서

이 문서는 `/v1/weather/core`, `/v1/weather/aqi`, `/v1/geocode` 프록시에 적용된
쿼터/남용 보호의 단일 진실 소스다. 코드로 들어간 보호(타임아웃·CDN 캐시·좌표
반올림·429 로깅)와, 코드 밖 Vercel 컨트롤 플레인에 존재하는 요청 제한(WAF `rate_limit`
규칙)을 함께 기술한다. WAF 규칙은 이 저장소가 아니라 Vercel에 배치되므로, 이 문서가
그 규칙의 형태·롤아웃 절차·롤백을 기록하는 유일한 지점이다.

## 배경 / 위협 모델

이슈 #73에서 서버가 OpenWeather API 키를 숨기기 위해 세 개의 얇은 per-request
프록시(`/v1/weather/core`, `/v1/weather/aqi`, `/v1/geocode`)를 도입했다. 이 프록시는
클라이언트가 좌표(또는 지오코딩 이름)만 넘기면 서버가 키를 붙여 OpenWeather를
호출하는 구조다.

키가 클라이언트에 노출되지 않는다는 점은 좋지만, 부작용으로 세 엔드포인트는
**인증 없이 누구나 호출할 수 있는 오픈 릴레이**가 되었다. 공격자가 키를 훔치지
않고도 이 엔드포인트를 반복 호출하는 것만으로 우리 OpenWeather 요청 쿼터를
소진시킬 수 있다(비용 발생 또는 정상 사용자에 대한 429 유발). 이 문서의 보호들은
그 쿼터 소진 위험을 다층으로 방어한다.

## 적용된 코드 보호

이 절의 내용은 이 브랜치에 실제로 병합된 코드의 동작이다. 값의 원본은 각 파일에
있으며, 값을 바꿀 때는 이 문서도 같은 PR에서 갱신한다.

### 양쪽 홉 타임아웃 (본문 읽기 포함)

프록시는 두 개의 네트워크 홉으로 이뤄지며, 각 홉은 응답 본문 읽기까지 포함해
타임아웃으로 보호된다. 멈춘 업스트림이 서버·클라이언트를 무한 대기시키지 못하게
하는 것이 목적이다.

- **서버 → OpenWeather:** `frontend/shared/api/openweather-proxy.server.ts`의
  `UPSTREAM_TIMEOUT_MS = 5000` (5초). `AbortController`가 `fetch`뿐 아니라
  `response.json()`까지 감싸므로, 헤더는 왔지만 본문 스트림이 멈춘 경우에도
  타임아웃이 발동한다.
- **클라이언트 → 프록시:** `frontend/shared/api/real-weather-provider.ts`의
  `fetchProxy`에서 `PROXY_TIMEOUT_MS = 8000` (8초). 서버 홉(5초)보다 **일부러
  길게** 두어, 업스트림이 느릴 때 서버가 먼저 정식 오류 응답을 반환하고
  클라이언트는 그 응답을 받도록 한다(클라이언트가 먼저 끊어 원인 정보를 잃지
  않게 함).

두 타임아웃은 기존 오류 계약을 바꾸지 않는다. 서버 응답의 오류 매핑은 다음과 같다.

| 상황                                             | HTTP 상태                 | 오류 `code`                 |
| ------------------------------------------------ | ------------------------- | --------------------------- |
| 타임아웃(abort) / 네트워크 오류 / JSON 파싱 실패 | 502                       | `INVALID_PROVIDER_RESPONSE` |
| 업스트림 비-2xx 응답(429 포함)                   | 업스트림 상태 그대로 통과 | `INVALID_PROVIDER_RESPONSE` |
| `OPENWEATHER_API_KEY` 미설정                     | 501                       | `PROVIDER_NOT_IMPLEMENTED`  |

업스트림 429는 502로 바뀌지 않고 **429 상태 그대로** 클라이언트까지 전달되며,
본문은 `INVALID_PROVIDER_RESPONSE`다. 클라이언트 홉(`fetchProxy`)은 자기 타임아웃이
발동하면 `WeatherProviderError({ code: 'INVALID_PROVIDER_RESPONSE' })`를 던지고,
프록시가 준 `PROVIDER_NOT_IMPLEMENTED` 본문은 그대로 같은 코드로 재던진다.

### CDN 캐시 (`applyProxyCacheControl`, 라우트 로더 경계에서 적용)

`frontend/shared/api/proxy-cache-control.ts`의 `applyProxyCacheControl`이 세 라우트
로더의 응답 경계에서 `Cache-Control` 헤더를 붙인다. 이 헬퍼는 **`response.ok`로
분기**한다. 성공(2xx) 응답에는

```
Cache-Control: public, max-age=0, s-maxage=<n>, stale-while-revalidate=<n>
```

를, 그 외 모든 응답(4xx/5xx)에는 `Cache-Control: no-store`를 설정한다. 즉 오류
응답을 `no-store`로 만드는 것은 호출부에 넘긴 TTL 인자가 아니라 헬퍼의
`response.ok` 분기다 — 오류 경로에서는 넘긴 TTL 값이 무시된다.

`<n>`(초)는 엔드포인트별 staleTime 정책과 맞춘다.

| 엔드포인트         | `s-maxage` = `stale-while-revalidate` | 근거                       |
| ------------------ | ------------------------------------- | -------------------------- |
| `/v1/weather/core` | 600 (10분)                            | 메인 날씨 staleTime과 일치 |
| `/v1/weather/aqi`  | 1800 (30분)                           | AQI staleTime과 일치       |
| `/v1/geocode`      | 86400 (1일)                           | 이름→좌표는 거의 불변      |

`max-age=0`은 브라우저 캐시를 신선한 것으로 취급하지 않게 하여, 브라우저 쪽
신선도는 여전히 TanStack Query staleTime이 관장하도록 한다. 실제 공유 캐시는
Vercel CDN만 수행한다(`s-maxage`). 결과적으로 인접 사용자·재요청이 같은 좌표에
대해 OpenWeather를 반복 호출하지 않고 CDN 캐시에서 처리되어, 집계 쿼터 소비가
줄어든다.

### lat/lon 좌표 반올림 (소수점 2자리, ~1.1km)

`frontend/shared/lib/round-coordinate.ts`의 `roundCoordinate`가 좌표를 소수점
2자리(약 1.1km)로 반올림한다. 인접 좌표를 같은 CDN 캐시 키/업스트림 호출로 모아
캐시 적중률을 높이고, 프록시로 전달되는 좌표 정밀도를 제한한다. 반올림은 **양쪽에서**
적용된다.

- **클라이언트 측:** `fetchProxy`가 core/aqi 요청에 보내는 `lat`/`lon`을 반올림해
  CDN 캐시 키를 정규화한다.
- **서버 측:** core/aqi 라우트 로더가 업스트림 URL을 만들 때 다시 반올림한다.
  누군가 프록시를 직접 curl로 호출해도 서버에서 정밀도가 잘리므로, 미세하게
  다른 좌표로 캐시 키를 우회하는 공격을 막는다.

`/v1/geocode`는 좌표가 아니라 이름 `q`를 받으므로 반올림 대상이 아니다.

### 업스트림 쿼터 로깅

`proxyOpenWeatherRequest`는 OpenWeather가 429를 반환하면 `console.warn`으로

```
[openweather-proxy] upstream returned 429 — quota/rate limit reached
```

를 남긴다. 이는 우리 쪽 쿼터/요청 제한 소진 신호이며 Vercel Logs에서 관측한다
(아래 관측 절 참고).

## WAF 규칙 런북 (요청 제한)

요청 제한 자체는 **이 코드 PR에 포함되지 않는다.** Vercel 컨트롤 플레인의 WAF
`rate_limit` 규칙으로 존재하며, CLI로 스테이징하고 **`vercel firewall publish`는
Ori가 실행**한다. 어시스턴트는 스테이징만 하며, attack-mode를 켜거나 완화를
멈추는 동작은 하지 않는다.

### 프리플라이트 (읽기 전용)

```bash
vercel link
vercel firewall overview
```

`vercel firewall overview`로 커스텀 규칙/WAF 엔타이틀먼트를 확인한다. 플랜에서
커스텀 규칙을 쓸 수 없으면, 코드 PR의 캐시 + 타임아웃 보호는 단독으로 유효하며
요청 제한 메커니즘은 다시 검토한다.

### 스테이지 1 — log 모드로 등록

```bash
vercel firewall rules add "Rate limit OpenWeather proxy" \
  --condition '{"type":"path","op":"pre","value":"/v1/weather"}' \
  --or --condition '{"type":"path","op":"pre","value":"/v1/geocode"}' \
  --action rate_limit --rate-limit-keys ip \
  --rate-limit-window 60 --rate-limit-requests 100 \
  --rate-limit-action log --yes
```

시작값은 60초 창에 IP당 100요청이다. 정상 버스트의 약 5–6배로 잡았다(위치 상세
1회 ≈ 2호출, 즐겨찾기 6개 새로고침 ≈ 12호출, 여기에 지오코딩). 먼저 `log`
액션으로 실제 트래픽에서 오탐 여부만 관측한다.

**per-region 카운터 주의:** rate-limit 카운터는 Vercel **리전별로 독립**이다.
따라서 여러 리전으로 분산된 클라이언트의 실효 한도는 (임계값 × 리전 수)에
가까워질 수 있다. 임계값을 정할 때 이 점을 감안한다.

### 스테이지 2 — 게시 (Ori 실행)

```bash
vercel firewall diff
vercel firewall publish --yes
```

게시 후 `/<team>/<project>/firewall/traffic?filter=<ruleId>`에서 오탐을 확인한다.

### 스테이지 3 — preview 먼저 강제, 그다음 production

`log` 관측이 깨끗하면 `--rate-limit-action rate_limit`로 바꾸되 `environment=preview`
조건을 붙여 preview에서 먼저 강제한다. 게시 후 preview URL에서 검증하고, 문제가
없으면 production으로 확장한다.

정리하면 롤아웃 순서는 **log → preview deny → production**이다.

## 관측

- **Firewall 대시보드:** `/<team>/<project>/firewall/traffic?filter=<ruleId>`에서
  규칙에 매칭된 트래픽과 액션을 본다.
- **메트릭:** `vc metrics vercel.firewall_action.count` — 방화벽 액션 카운트를
  조회한다(**Observability Plus 필요**).
- **Vercel Logs:** 업스트림 429가 발생하면 `[openweather-proxy] upstream returned
429 …` 경고가 로그에 남는다. 이는 우리 쪽 OpenWeather 쿼터/요청 제한 소진
  신호다.

## 롤백

- 규칙 비활성화: `vercel firewall rules disable "Rate limit OpenWeather proxy"`
- 또는 강제를 풀고 관측만: `--action log`(= `--rate-limit-action log`)로 되돌린다.
- **지속(duration) 액션은 롤아웃 중 사용하지 않는다.** 롤아웃 단계에서는 log 또는
  창 단위 rate_limit만 쓰고, 차단을 일정 시간 유지하는 duration 액션은 오탐 시
  피해가 커지므로 배제한다.

## 알려진 한계

- **per-IP 제한의 범위:** WAF 규칙은 단일 클라이언트(IP)의 반복 남용만 막는다.
  분산된 여러 IP나 리전별 카운터를 우회하는 트래픽에는 상한을 보장하지 못한다.
- **집계 쿼터 상한은 다른 계층이 담당:** OpenWeather로 나가는 **집계** 호출량의
  실질적 상한은 요청 제한이 아니라 **CDN 캐시(`s-maxage`) + 좌표 반올림**이
  담당한다. 같은 좌표에 대한 반복 요청이 CDN에서 처리되고 인접 좌표가 같은 키로
  모이므로 업스트림 호출 자체가 줄어든다. 요청 제한은 그 위에 얹는 단일 클라이언트
  방어다.
- **후속 과제 — `fetch-remote-manifest.ts`의 동일 갭:** 참고 파일
  `frontend/entities/asset/api/fetch-remote-manifest.ts`에는 이 브랜치가 프록시에서
  고친 것과 **동일한 본문-읽기 타임아웃 갭**이 남아 있다(타임아웃이 `fetch`는
  감싸지만 본문 읽기까지는 감싸지 않는 형태). 이 이슈(#98) 범위 밖이며 별도
  후속 과제로 다룬다.
