# Weatherpane 프로젝트 회고 (기술편)

미래의 나를 위한 회고.

Weatherpane는 대한민국 지역을 대상으로 하는 React + TypeScript + Tailwind 날씨 앱이다. 겉으로 보면 "지역을 검색해서 날씨를 보여주는 앱"이지만, 실제 구현에서 어려웠던 지점은 날씨 API 호출 그 자체가 아니었다. 더 오래 붙잡고 있던 문제는 다음에 가까웠다.

- 한국 행정구역 검색을 어떻게 즉시성과 결정성을 유지한 채 구현할 것인가
- 지원하지 않는 위치를 사용자가 선택했을 때 기존 활성 위치를 망가뜨리지 않을 것인가
- TanStack Query 캐시와 장기 저장 스냅샷을 어떻게 분리할 것인가
- 오프라인이나 API 실패 상황에서 어디까지 보여주고, 어디서 솔직하게 실패를 말할 것인가
- 즐겨찾기처럼 작아 보이는 기능 안에 들어 있는 정렬, 별칭, undo, 접근성, 카드 상태를 어떻게 한 계약으로 묶을 것인가

이번 회고는 기능 목록보다 이 문제들을 어떤 구조로 풀었는지에 집중한다.

## 1. 프로젝트 요약

Weatherpane는 "현재 위치 또는 선택한 위치의 날씨를 빠르게 확인하고, 네트워크가 불안정해도 마지막으로 신뢰 가능한 정보를 정직하게 보여주는 앱"을 목표로 했다.

핵심 사용자 흐름은 아래와 같다.

- `/search?q=...`에서 대한민국 지역을 검색한다.
- 검색 결과를 선택하면 위치 해소 과정을 거쳐 `/location/:resolvedLocationId`로 이동한다.
- 선택한 위치는 active location으로 저장되어 홈 화면에서 다시 열린다.
- 홈과 상세 화면은 날씨, AQI, 시간별 예보, 즐겨찾기 토글을 제공한다.
- 즐겨찾기 화면에서는 저장한 위치를 읽고, 편집 모드에서 순서와 닉네임을 관리한다.
- 오프라인이나 API 실패 시에는 가능한 경우 저장된 스냅샷을 표시하고, 불가능하면 복구 가능한 오류 화면을 보여준다.

현재 HEAD 기준으로 확인한 규모는 다음과 같다.

- 커밋 수: 249개
- task 문서: 22개
- 위치 카탈로그: 20,556개 항목
- 라우트 파일: 6개
- 테스트 파일: 59개
- Vitest: 50개 파일, 486개 테스트 통과
- Playwright E2E 파일: 8개
- 스케치 WebP 에셋: 22개

기술 스택은 React Router 7, React 19, TypeScript, Tailwind CSS 4, TanStack Query 5, Vitest, Playwright를 중심으로 구성했다. 서버 상태는 TanStack Query로 관리하고, 세션을 넘어 보존해야 하는 앱 상태는 명시적 storage repository로 관리했다.

## 2. 프로젝트 철학

### 신선함보다 정직함

날씨 앱은 최신 정보가 중요하지만, 최신 정보를 항상 가져올 수는 없다. 그래서 Weatherpane에서는 "항상 새 데이터를 보여준다"가 아니라 "새 데이터인지, 오래된 데이터인지, 실패했는지를 숨기지 않는다"를 우선했다.

이 철학은 스냅샷 fallback 설계로 이어졌다. 날씨 스냅샷은 24시간, AQI 스냅샷은 12시간까지만 fallback으로 사용할 수 있다. cutoff를 넘긴 데이터는 현재 정보처럼 보여주지 않는다.

### URL은 공유 가능한 검색 상태

검색어는 `/search?q=...`에 저장된다. 사용자가 링크를 열었을 때와 직접 타이핑했을 때 같은 UI 상태가 나와야 한다. 동시에 타이핑 중에는 history를 replace하고, 명시적 이동에서만 push해야 한다.

이 원칙 덕분에 검색 페이지는 단순한 input 화면이 아니라, 새로고침과 공유를 견디는 상태 표면이 되었다.

### Query cache는 persistence가 아니다

TanStack Query는 런타임 캐시다. 이 캐시를 세션 간 저장소처럼 쓰면 stale 정책과 사용자에게 보여줄 수 있는 데이터 계약이 섞인다.

Weatherpane에서는 Query cache를 장기 persistence로 쓰지 않았다. 대신 active location, favorites, recents, theme, weather snapshots, AQI snapshots를 각자의 versioned storage key로 저장했다.

### 지원하지 않는 위치는 명시적으로 실패한다

대한민국 지역을 대상으로 하는 앱이므로, 해외 위치나 카탈로그로 확정할 수 없는 위치는 active location을 덮어쓰면 안 된다. 지원하지 않는 위치는 `unsupported::<catalogLocationId>` 토큰으로 별도 라우팅하고, 기존 active location은 유지한다.

이 결정은 작은 것처럼 보이지만 제품 신뢰성에는 중요했다. 사용자가 잘못된 위치를 눌렀다고 해서 홈의 기준 위치까지 바뀌면 안 된다.

## 3. 아키텍처 구조

프로젝트는 Feature-Sliced Design을 따른다.

```text
frontend/
├── app/          전역 provider, effects, styles
├── pages/        home, search, location, favorites 화면 조립
├── features/     search, favorites, recents, weather-queries, app-bootstrap
├── entities/     location, weather, aqi, asset 도메인
└── shared/       storage, api provider, hooks, ui primitives

app/
├── root.tsx      React Router root, theme init script
├── routes.ts     route config
└── routes/       route modules
```

레이어 책임은 꽤 엄격하게 나눴다.

- `entities/location`: 카탈로그 타입, 검색 엔진, 위치 해소, 위치 모델 검증
- `entities/weather`, `entities/aqi`: provider 응답을 앱 모델로 정규화
- `entities/asset`: 날씨/지역 조건을 semantic sketch key로 변환
- `features/weather-queries`: TanStack Query key, stale policy, refresh helper
- `features/app-bootstrap`: 홈/상세 화면의 로딩, 데이터, fallback, 오류 상태 오케스트레이션
- `features/favorites`: 즐겨찾기 CRUD, undo, refresh queue
- `features/recents`: MRU 저장 로직
- `shared/lib/storage`: versioned localStorage/sessionStorage repository

데이터 흐름은 대략 다음과 같다.

```text
Page
-> feature hook
-> entity/domain model
-> shared provider or storage repository
-> normalized app-facing data
-> page/component rendering
```

UI가 OpenWeather 응답 shape를 직접 보지 않도록 만든 것이 중요했다. 날씨 API가 어떤 필드명을 쓰는지는 adapter에서 끝나고, 화면은 `CoreWeather`와 `Aqi`만 소비한다.

## 4. 핵심 비즈니스 로직과 문제 해결

### 4.1 한국 카탈로그 기반 검색

Pain point: 한국 행정구역 검색은 단순 문자열 검색으로 끝나지 않는다.

같은 지명이 여러 부모 행정구역 아래에 반복될 수 있고, 사용자는 `서울특별시`, `서울`, `강남구`, `강남`처럼 접미사를 생략해서 입력한다. 또한 한국어 입력에서는 IME 조합 중 React가 input value를 잘못 되돌리면 자모 분리 문제가 발생한다.

Solution: 검색을 OpenWeather나 외부 geocoding endpoint에 맡기지 않고, 빌드된 로컬 카탈로그에서 즉시 수행했다.

구현의 핵심은 `frontend/entities/location/model/search.ts`와 `location-match.ts`에 있다.

- 입력은 NFC normalize한다.
- 공백, 구두점, 기호는 비교용 문자열에서 접는다.
- 생략 허용 suffix는 `시`, `도`, `구`, `군`, `읍`, `면`, `동`, `리`로 좁게 제한한다.
- match rank는 exact leaf, exact segment, path substring 순서로 둔다.
- depth와 canonical path로 deterministic sort를 유지한다.

검색 페이지에서는 URL query와 input 표시 값을 의도적으로 분리했다.

`/search?q=...`는 authoritative state지만, input의 `value`를 곧바로 URL query에 묶으면 타이핑 중 300ms debounce 사이에 React가 오래된 URL 값을 DOM에 다시 밀어 넣을 수 있다. 이 문제가 한국어 IME 조합 중 자모 분리로 이어졌다.

그래서 `SearchPage`는 `inputValue`를 즉시 업데이트하고, URL은 300ms debounce 후 replace한다. Enter, Escape 같은 직접 조작은 pending debounce를 먼저 취소한다. IME 조합 중 keydown은 무시한다.

결과적으로 검색은 다음 조건을 만족한다.

- 직접 `/search?q=서울`로 열어도 같은 결과가 나온다.
- 타이핑 중에는 history가 늘어나지 않는다.
- 검색 결과 선택 같은 명시적 이동에서만 route navigation이 발생한다.
- 한국어 조합 입력이 깨지지 않는다.

### 4.2 위치 해소와 unsupported route

Pain point: 카탈로그 검색 결과는 앱 내부의 후보일 뿐, 실제 날씨 API 호출에 필요한 좌표와 timezone을 항상 갖고 있지 않다.

또한 geocoding provider는 여러 후보를 줄 수 있고, 해외 후보가 섞일 수도 있다. 이때 잘못 해소한 위치를 active location으로 저장하면 홈 화면까지 오염된다.

Solution: 위치 해소 파이프라인을 명시적인 순서로 만들었다.

`frontend/entities/location/model/location-resolution.ts`의 흐름은 다음과 같다.

1. manual override table을 먼저 확인한다.
2. 없으면 provider geocoding을 호출한다.
3. KR 후보만 남기고 target path/leaf와 비교한다.
4. 매칭되면 `loc_<catalogLocationId>` 형식의 resolved route id를 만든다.
5. 매칭되지 않으면 `unsupported::<catalogLocationId>` 토큰과 sessionStorage context를 저장한다.

검색 선택 로직은 `useSearchSelection`이 소유한다. resolved 결과일 때만 active location을 업데이트하고 recents에 저장한다. unsupported 결과는 해당 route로만 이동하고 active location은 건드리지 않는다.

이 분리가 실제 제품 안정성을 만든다. 사용자가 지원하지 않는 지역을 선택해도 기존 홈 위치는 유지된다.

### 4.3 북마크와 딥링크의 cold load

Pain point: 사용자가 `/location/loc_...` URL을 직접 열면 active location context가 비어 있을 수 있다.

초기 구현이 active location에만 의존하면 검색을 거치지 않은 상세 URL은 날씨를 불러올 수 없다. 실제로 최근 히스토리에는 북마크/딥링크 URL에서 날씨 로드 실패를 고친 커밋이 있다.

Solution: 상세 bootstrap이 URL의 `loc_` id에서 catalog id를 복원하고, 카탈로그 hit가 있으면 위치 해소를 다시 수행한다.

`useDetailBootstrap`은 active location이 없을 때 `getCatalogEntryById`로 cold load를 시도한다. 성공하면 active location을 채우고 loading 상태에서 다음 렌더를 기다린다. 실패하면 not-found로 보낸다.

또한 route loader는 `loc_` 접두사가 없는 구형 URL을 canonical route로 redirect한다. 이 loader redirect는 React Router의 StaticRouter 경고를 피하기 위한 선택이었다.

### 4.4 현재 위치와 raw GPS fallback

Pain point: 현재 위치는 실패 경우가 많다.

브라우저 권한 거부, timeout, 위치 확인 불가, reverse geocoding 실패, 한국 카탈로그 canonicalization 실패, 해외 위치가 모두 다른 의미를 가진다. 이 모든 실패를 하나의 "위치 실패"로 뭉개면 사용자가 무엇을 할 수 있는지 알기 어렵다.

Solution: `createCurrentLocationService`가 결과를 세 가지로 나눈다.

- `resolved`: 카탈로그와 매칭된 대한민국 위치
- `raw-gps`: 좌표는 얻었지만 카탈로그 위치로 확정하지 못한 fallback
- `recovery-required`: 권한, timeout, position unavailable 같은 복구 필요 상태

geolocation은 8초 timeout으로 제한했다. reverse geocode 후보 중 KR 후보를 우선하고, 가장 깊은 canonical match를 선택한다. 그래도 실패하면 raw GPS fallback을 만든다.

raw GPS fallback은 `gps:<lat>:<lon>` id를 갖고, favorite에는 추가할 수 없다. 이것도 중요한 제품 결정이다. 카탈로그로 안정적으로 식별되지 않는 위치를 즐겨찾기에 저장하면 나중에 이름, 행정구역, 좌표가 흔들릴 수 있다.

### 4.5 날씨와 AQI provider 정규화

Pain point: OpenWeather 응답을 화면에 직접 넘기면 API 교체가 어려워지고, 테스트도 provider fixture에 종속된다.

OpenWeather의 `temp`, `feels_like`, `uvi`, `pm2_5`, weather condition id 같은 필드는 앱이 사용자에게 보여줄 모델과 다르다. UI가 이 shape를 알기 시작하면 provider가 비즈니스 모델이 되어버린다.

Solution: provider boundary를 만들고, adapter가 앱 모델로 정규화한 뒤 반환하게 했다.

핵심 모델은 다음 두 개다.

- `CoreWeather`: 현재 기온, 체감, 습도, 바람, 강수, UV, 이슬점, 12시간 hourly, 오늘 최저/최고, condition
- `Aqi`: AQI 값, category, 오염물질 수치, source

OpenWeather adapter는 응답을 검증한 뒤 다음을 수행한다.

- condition id를 `CLEAR`, `CLOUDY`, `RAIN`, `SNOW` 코드로 변환한다.
- 비/눈 여부와 강수량으로 intensity를 계산한다.
- icon suffix로 day/night를 판단한다.
- visual bucket을 `clear`, `cloudy`, `rainy`, `snowy`로 매핑한다.
- hourly는 처음 12개만 사용한다.
- AQI 1-5 값은 `good`, `fair`, `moderate`, `poor`, `very-poor` category로 바꾼다.

provider는 mock과 real 두 가지가 있다. mock provider도 OpenWeather fixture를 같은 normalizer에 통과시키므로, 데모와 테스트가 실제 adapter contract를 계속 검증한다.

### 4.6 서버 상태와 스냅샷 persistence 분리

Pain point: 날씨 데이터는 자주 바뀌지만, 오프라인 fallback은 세션을 넘어 보존되어야 한다.

TanStack Query cache를 persist하면 구현은 쉬워 보이지만, "사용자에게 fallback으로 보여줘도 되는 데이터인가"라는 제품 판단과 "쿼리 라이브러리가 stale한가"라는 런타임 판단이 섞인다.

Solution: Query cache와 스냅샷 저장소를 분리했다.

TanStack Query 정책은 다음처럼 고정했다.

- 핵심 날씨 staleTime: 10분
- AQI staleTime: 30분
- retry: 1
- refetchOnWindowFocus: true

반면 세션 간 fallback용 데이터는 versioned storage repository에 저장한다.

- weather snapshots: localStorage
- AQI snapshots: localStorage
- weather snapshot cutoff: 24시간
- AQI snapshot cutoff: 12시간

`useHomeBootstrap`과 `useDetailBootstrap`은 query 성공 시 스냅샷을 저장한다. query 실패 시에는 storage에서 스냅샷을 읽고 cutoff helper로 검증한다. 유효한 weather snapshot이 있으면 stale fallback을 반환하고, AQI snapshot은 12시간 안일 때만 함께 붙인다.

이 구조 덕분에 앱은 "오래된 데이터라도 보여줄 것인가"를 Query 설정이 아니라 제품 규칙으로 결정한다.

### 4.7 홈과 상세 화면 bootstrap state

Pain point: 홈과 상세 화면에는 로딩, 정상 데이터, stale fallback, recoverable error, config error, unsupported, not-found가 섞인다.

이 분기를 컴포넌트 안에서 ad hoc boolean 조합으로 처리하면 화면 상태가 금방 무너진다. 예를 들어 weather는 성공했지만 AQI가 실패한 경우, data가 있지만 refresh error가 있는 경우, snapshot은 있지만 AQI snapshot만 만료된 경우가 모두 다르다.

Solution: bootstrap hook이 discriminated union을 반환하게 했다.

홈은 다음 상태를 가진다.

- `no-location`
- `config-error`
- `loading`
- `data`
- `stale-fallback`
- `recoverable-error`

상세는 여기에 route 특화 상태가 추가된다.

- `unsupported`
- `not-found`
- `loading`
- `data`
- `stale-fallback`
- `recoverable-error`

페이지 컴포넌트는 이 상태를 받아 화면만 고른다. 비즈니스 판단은 bootstrap hook에 모인다. 이 덕분에 테스트도 "어떤 조건에서 어떤 state가 나오는가"를 직접 검증할 수 있었다.

### 4.8 즐겨찾기: 작은 CRUD가 아니었다

Pain point: 즐겨찾기는 처음에는 단순히 위치를 저장하는 기능처럼 보인다. 하지만 실제 제품 규칙은 훨씬 많았다.

- 최대 6개까지만 저장한다.
- Favorites와 Recents는 독립이다.
- 순서는 수동이며 persisted되어야 한다.
- 닉네임은 20자 hard cap이다.
- 닉네임 편집과 reorder는 편집/정렬 모드에서만 보여야 한다.
- 삭제 후 undo는 정확한 이전 상태를 복원해야 한다.
- undo 가능한 삭제는 최신 1건뿐이다.
- 제거해도 active location은 바뀌면 안 된다.
- raw GPS 위치는 즐겨찾기에 추가할 수 없다.

Solution: store action layer에서 규칙을 막았다.

`useFavorites`는 `addFavorite`, `removeFavorite`, `updateNickname`, `reorderFavorites`, `undoRemove`를 제공한다. 7번째 추가는 `max-reached`를 반환하고, 중복 추가는 `duplicate`를 반환한다. 삭제는 현재 favorites 배열 전체를 undo snapshot으로 저장한다. 그래서 undo는 단순 re-add가 아니라 순서와 닉네임까지 포함한 이전 상태를 복원한다.

닉네임은 입력에서도 `maxLength={20}`으로 막고, action에서도 trim 후 `slice(0, 20)`을 적용한다. UI만 믿지 않고 저장 경계에서도 다시 자른다.

편집 화면은 `draftFavorites`를 두고, 편집 모드에서 순서를 바꾼 뒤 완료 시 한 번 저장한다. 드래그 핸들도 있지만 접근성 대안으로 위로/아래로 버튼을 제공한다.

### 4.9 즐겨찾기 카드 상태와 refresh queue

Pain point: 즐겨찾기 목록은 여러 위치의 날씨 카드를 동시에 보여준다. 각 카드의 상태가 다를 수 있고, 네트워크 실패가 전체 페이지 실패로 번지면 안 된다.

Solution: 카드 상태를 세 가지로 나눴다.

- data 없음 + loading: 카드 skeleton
- data 없음 + error: inline error와 다시 시도 버튼
- data 있음 + refresh error: 기존 snapshot을 유지하고 stale indicator 표시

데이터가 없는 error 카드는 상세로 navigate되지 않는다. 반대로 기존 데이터가 있는 카드는 refresh 실패가 있어도 사용자가 들어갈 수 있다.

또한 `useRefreshQueue`는 즐겨찾기 진입 시 stale한 카드만 골라 refetch한다. 이미 fetching 중이면 건너뛰고, concurrency는 2로 제한한다. 실패한 카드가 있어도 `Promise.allSettled`로 다음 카드 처리를 계속한다. 같은 pass에서 queue-level retry를 하지 않는 것도 의도적이다. 실패 폭주를 막고, 다음 trigger나 사용자의 다시 시도에 맡긴다.

### 4.10 Recents: 즐겨찾기와 분리된 MRU

Pain point: 최근 위치와 저장 위치는 의미가 다르다.

최근 위치를 즐겨찾기와 섞으면 "잠깐 본 위치"와 "내가 고정한 위치"의 기대가 충돌한다. 반대로 최근 위치가 없으면 검색 첫 화면이 너무 비어 보인다.

Solution: Recents를 별도 repository로 두고 MRU 규칙을 적용했다.

`persistRecent`는 같은 location id를 제거한 뒤 맨 앞에 다시 넣고, 최대 10개까지만 유지한다. 상세 화면이 data 또는 stale-fallback 상태에 도달했을 때 한 번만 저장한다. 홈에서는 refresh나 favorite toggle처럼 사용자가 현재 위치를 다시 확인하는 action에서도 recent를 갱신한다.

검색 첫 화면은 recents가 있으면 "최근 지역"을 먼저 보여주고, 그 아래에 "인기 지역"을 보여준다. query가 활성화되면 두 섹션은 숨기고 검색 결과만 보여준다.

### 4.11 스케치 에셋 시스템

Pain point: 날씨 앱에서 시각 자산을 단순 파일 import로 처리하면 조건과 지역이 늘어날수록 컴포넌트가 파일 경로를 알게 된다.

Weatherpane는 서울/부산 같은 hub 지역과 generic urban fallback을 나누고, clear/cloudy/rainy/snowy와 day/night 조합을 다룬다. 모든 조합에 이미지를 무조건 만들면 비용이 커지고, 일부 조합이 없을 때 fallback도 필요하다.

Solution: semantic key와 manifest를 도입했다.

예시는 다음과 같다.

```text
hub/seoul/clear-day
hub/busan/rainy-night
generic/urban/snowy-day
```

`selectSketchKey`는 위치와 weather condition에서 key를 고른다.

- 서울특별시 -> `hub/seoul`
- 부산광역시 -> `hub/busan`
- 그 외 resolved 위치와 raw GPS -> `generic/urban`

hub family는 8개 variant를 그대로 지원한다. generic family는 6개만 있으므로 `cloudy-night -> clear-night`, `snowy-night -> rainy-night`로 시각적으로 가까운 fallback rewrite를 적용한다.

매니페스트는 key를 URL로 매핑한다. baseline manifest는 앱과 함께 번들되고, remote override는 세션 시작 시 백그라운드로 가져와 다음 세션에만 적용한다. 세션 중 hot swap을 하지 않기 때문에 렌더링 중 이미지가 갑자기 바뀌지 않는다.

이미지 로딩도 fallback이 있다. override URL이 실패하면 baseline으로 한 번 바꾸고, baseline도 실패하면 숨긴다. 컴포넌트는 에셋 실패 때문에 throw하지 않는다.

### 4.12 테마와 디자인 토큰

Pain point: 테마는 단순 dark toggle이 아니다.

초기 paint 전에 `.dark` 클래스가 결정되지 않으면 FOUC가 생긴다. React hydration 전에 사용자가 토글을 누르는 경우도 고려해야 한다. 또 Tailwind utility와 디자인 문서가 따로 놀면 색상과 반경이 금방 drift된다.

Solution: token source와 초기화 경로를 분리했다.

`frontend/app/styles/tokens.css`가 Haet-Ssal 밝은 모드와 Dal-Bit Night 어두운 모드의 source of truth다. Tailwind v4의 class-based dark variant를 사용하고, `<html>`의 `.dark` 클래스로 전환한다.

`app/root.tsx`에는 theme init script가 있다. 이 스크립트는 React가 hydrate되기 전에 sessionStorage/localStorage의 versioned theme payload를 읽고 `.dark`를 적용한다. 저장값이 없으면 system preference를 따른다.

React 쪽 `ThemeProvider`는 같은 규칙을 이어받고, toggle 시 localStorage와 sessionStorage에 모두 저장한다. sessionStorage를 함께 쓰는 이유는 같은 탭 세션에서 localStorage가 지워지는 상황에도 선택을 유지하기 위해서다.

디자인 토큰은 Playwright에서 실제 computed value로 검증한다. 단순히 CSS 파일을 읽는 것이 아니라 브라우저에서 light/dark 값을 확인한다.

### 4.13 환경 설정과 mock/real provider

Pain point: 개발 편의를 위해 mock data는 필요하지만, production에서 조용히 mock으로 fallback하면 장애를 숨긴다.

Solution: provider mode를 명시적 환경 변수로 만들었다.

- `VITE_WEATHER_PROVIDER_MODE=mock`
- `VITE_WEATHER_PROVIDER_MODE=real`
- real mode에서는 `OPENWEATHER_API_KEY` 필요

`parseAppConfig`는 mode가 없거나 잘못되면 ConfigError를 반환한다. production에서는 설정 오류 화면을 보여주고, 개발/테스트에서는 mock path를 사용할 수 있다.

개발 중에는 화면 우하단의 dev provider toggle로 mock/real을 바꿀 수 있다. 이 값은 `__wp_dev_provider_mode`에 저장되고 reload 후 적용된다. production에서는 이 버튼이 렌더링되지 않는다.

### 4.14 오프라인과 복구

Pain point: 아직 service worker 기반 완전 오프라인 앱은 아니다. 그런데 네트워크가 끊겼을 때 아무 상태도 표시하지 않으면 사용자는 앱이 멈춘 것처럼 느낀다.

Solution: 현재 구현 범위에서는 세 가지 수준의 복구를 제공한다.

- `useOnlineStatus`가 browser online/offline 이벤트를 추적한다.
- 전역 offline banner가 오프라인 상태를 표시한다.
- offline 이후 online으로 복구되면 active location의 weather/AQI query를 invalidate한다.
- query 실패 시 유효한 스냅샷이 있으면 stale fallback을 보여준다.
- 스냅샷도 없으면 retry 가능한 connection error 화면을 보여준다.

초기 명세에는 service worker와 CacheStorage 기반 전략도 포함되어 있지만, 현재 MVP에는 구현되어 있지 않다. 회고 관점에서는 이것을 누락이라기보다 scope control로 보는 편이 맞다. 먼저 "정직한 fallback 상태 모델"을 만들고, 그 위에 service worker를 얹을 수 있는 구조를 마련한 상태다.

## 5. 잘한 점

### 상태 경계를 먼저 나눴다

가장 좋은 결정은 TanStack Query와 persistent storage를 섞지 않은 것이다. 날씨 데이터의 runtime freshness와 사용자에게 보여줄 수 있는 fallback eligibility는 서로 다른 문제다.

이 경계를 나눈 덕분에 다음 규칙이 코드와 테스트에 명확하게 남았다.

- Query staleTime은 10분/30분이다.
- fallback snapshot cutoff는 24시간/12시간이다.
- Query cache는 세션 간 persistence가 아니다.

### 검색과 위치 해소를 분리했다

검색 결과를 곧바로 위치로 취급하지 않고, resolution pipeline을 따로 둔 것이 좋았다.

검색은 빠르고 deterministic해야 한다. 위치 해소는 provider와 실패 가능성을 다뤄야 한다. 이 둘을 분리했기 때문에 unsupported 위치가 active location을 오염시키지 않는 규칙도 자연스럽게 들어갔다.

### 테스트가 제품 규칙을 문서화했다

테스트 이름만 봐도 제품 규칙을 읽을 수 있다.

- "IME composition 중 Enter로 navigate하지 않는다"
- "unsupported 선택은 active location을 변경하지 않는다"
- "정확히 24h 된 스냅샷은 무효하다"
- "undoRemove는 정확한 이전 상태를 복원한다"
- "refresh queue는 최대 2개만 동시에 refetch한다"
- "remote manifest 성공은 다음 load용 pending에만 기록한다"

이런 테스트는 단순 regression guard가 아니라 의사결정 기록이다.

### Mock path가 실제 adapter를 통과한다

mock provider가 별도 fake model을 반환하지 않고 OpenWeather fixture를 normalizer에 통과시키는 구조가 좋았다. 덕분에 mock 모드에서도 provider adapter 계약이 계속 검증된다.

개발 편의와 production safety 사이의 균형도 괜찮았다. local demo는 mock으로 빠르게 돌릴 수 있지만, production config error는 조용히 숨기지 않는다.

### 에셋 시스템을 semantic key로 묶었다

이미지 파일 경로를 컴포넌트가 직접 아는 구조였다면, 날씨 조건과 지역이 늘어날 때마다 UI 코드가 흔들렸을 것이다.

semantic key, baseline manifest, remote override, fallback 렌더링을 분리한 덕분에 에셋 제작 파이프라인과 UI 사용처가 느슨하게 연결되었다.

## 6. 아쉬운 점과 기술 부채

### 초기 명세가 구현 범위보다 넓었다

`docs/specs.md`와 favorites 초기 명세에는 REST API, ETag, IndexedDB, service worker 같은 더 큰 구상이 들어 있다. 현재 MVP는 localStorage/sessionStorage와 client-side mock/real provider 중심이다.

큰 방향을 잡는 데는 도움이 됐지만, 회고와 인수인계 관점에서는 "구현된 것"과 "미래 구상"을 더 일찍 분리했어야 한다. 그렇지 않으면 문서를 읽는 사람이 이미 구현된 기능으로 오해할 수 있다.

### `useFavorites`는 단일 인스턴스 가정이 있다

코드 주석에도 적혀 있듯이 `useFavorites`는 동시에 여러 인스턴스가 마운트되지 않는다는 현재 라우팅 구조에 기대고 있다. 홈, 상세, 즐겨찾기는 서로 다른 route surface라 당장은 괜찮다.

하지만 사이드바나 persistent shell에서 즐겨찾기 상태를 동시에 보여주기 시작하면 각 hook instance가 독립 state를 가지는 문제가 생긴다. 이 시점에는 context 또는 external store로 올리는 것이 맞다.

### service worker는 아직 없다

오프라인 UX는 snapshot fallback과 online/offline 이벤트 수준까지 구현되어 있다. 하지만 앱 셸 precache, 런타임 캐시, 정적 에셋 cache 같은 PWA 수준의 offline support는 아직 없다.

현재 구조는 service worker를 얹을 준비는 되어 있지만, "완전한 오프라인 앱"이라고 말하면 과장이다.

### 즐겨찾기 동기화는 로컬 MVP에 머물러 있다

초기 favorites 명세에는 서버 CRUD, ETag, If-Match, conflict handling까지 구상되어 있다. 현재 구현은 localStorage repository 중심이다.

단일 기기 MVP로는 충분하지만, 멀티 디바이스 동기화나 계정 기반 저장을 하려면 sync queue와 server contract를 실제로 구현해야 한다.

### 오류 화면과 디자인 토큰의 언어가 일부 섞여 있다

일부 error UI에는 영어 문구와 과거 token alias처럼 보이는 class가 남아 있다. 핵심 비즈니스 로직은 정리되어 있지만, 화면 polish 관점에서는 한국어 copy와 현재 token 체계로 한 번 더 정렬할 필요가 있다.

### 생성 카탈로그가 크다

카탈로그는 20,556개 항목으로 충분히 실용적이지만, `catalog.generated.json`은 큰 파일이다. 현재 검색은 클라이언트 로컬 즉시성을 얻는 대신 bundle/data size 부담을 받아들인 선택이다.

MVP에서는 타당하지만, 성능 예산이 빡빡해지면 prefix index, lazy chunk, 압축, worker search 같은 개선을 검토할 수 있다.

## 7. 아키텍처 교훈

### "캐시"와 "사용자에게 보여줄 수 있는 저장 데이터"는 다르다

이 프로젝트에서 가장 중요한 교훈이다.

TanStack Query의 cache는 fetch lifecycle을 최적화하는 도구다. 반면 persisted snapshot은 사용자가 오프라인일 때도 볼 수 있는 제품 데이터다. 둘은 만료 기준도 다르고, 실패 시 의미도 다르다.

이 둘을 분리하면 코드가 조금 늘어난다. 대신 데이터의 의미가 명확해진다.

### unsupported를 별도 상태로 만들면 active state가 보호된다

지원하지 않는 위치를 그냥 error로 처리하거나, 실패한 상태에서도 active location을 바꾸면 사용자의 기준 위치가 흔들린다.

`unsupported::` route token은 단순한 문자열 규칙이 아니라 product safety boundary였다. 실패한 탐색과 성공한 위치 선택을 분리해준다.

### URL-backed state는 입력 UX와 충돌할 수 있다

URL을 source of truth로 두는 것은 좋다. 하지만 input의 DOM value까지 곧장 URL state에 묶으면 IME, debounce, history replace가 부딪힌다.

검색 페이지에서 inputValue와 URL query를 분리한 것은 작지만 중요한 수정이었다. 특히 한국어 앱에서는 IME 조합을 반드시 별도 시나리오로 테스트해야 한다.

### 작은 기능일수록 계약을 문서화해야 한다

즐겨찾기는 작은 기능처럼 보였지만, 실제로는 가장 많은 제품 규칙이 들어갔다. cap, order, nickname, undo, edit mode, card state, refresh queue, accessibility가 모두 얽혔다.

이런 기능은 "대충 CRUD"로 시작하면 나중에 규칙이 UI 곳곳에 흩어진다. 먼저 FAV 규칙처럼 계약을 고정한 것이 도움이 됐다.

### Visual asset도 domain model이 필요하다

날씨 이미지는 장식이 아니라 상태 표현이다. 따라서 파일 경로가 아니라 "어떤 날씨/지역 상태를 어떤 semantic key로 표현할 것인가"가 도메인 모델이 된다.

semantic key와 manifest를 둔 덕분에 UI는 "이미지 파일"이 아니라 "날씨 의미"를 렌더링한다.

## 8. 다음 단계

우선순위를 둔다면 다음 순서가 좋아 보인다.

1. 문서 정리

   구현된 MVP와 미래 구상을 명확히 나눈다. service worker, REST favorites API, IndexedDB, ETag sync는 "미구현/차기 범위"로 표시한다.

2. Favorites 상태 공유 구조 개선

   `useFavorites`의 단일 인스턴스 가정을 제거할 시점이 오면 context나 external store로 올린다. persistent shell에서 즐겨찾기 상태를 동시에 보여주는 순간이 trigger다.

3. Service worker 기반 offline 강화

   현재 snapshot fallback 위에 app shell precache와 sketch asset cache를 얹는다. 단, Query cache persistence와 혼동하지 않도록 스냅샷 규칙은 그대로 유지한다.

4. Error screen과 copy polish

   영어 문구와 이전 token alias를 현재 한국어 제품 톤과 design token 체계로 정렬한다.

5. 실제 운영 준비

   real provider 모드에서 API key, quota, provider failure, monitoring, deployment 환경 변수 검증을 운영 수준으로 끌어올린다.

6. 검색 데이터 성능 점검

   20,556개 로컬 카탈로그가 현재는 충분히 빠르지만, bundle budget과 초기 로드 비용을 측정한다. 문제가 확인되면 index나 lazy loading을 검토한다.

## 9. 마무리

Weatherpane는 기능 규모만 보면 거대한 서비스는 아니다. 하지만 좋은 의미에서 작은 앱 안에 프론트엔드 제품 설계의 중요한 문제들이 많이 들어 있었다.

검색은 URL과 IME를 함께 고려해야 했고, 위치 선택은 지원 범위를 침범하지 않아야 했고, 날씨 데이터는 최신성과 정직함 사이에서 균형을 잡아야 했다. 즐겨찾기는 CRUD보다 훨씬 복잡했고, 에셋은 단순 이미지가 아니라 상태 표현 모델이었다.

이번 프로젝트에서 가장 마음에 드는 부분은 "실패 상태를 숨기지 않는 구조"다. 설정이 잘못되면 설정 오류라고 말하고, 위치를 지원하지 않으면 지원하지 않는다고 말하고, 네트워크가 실패하면 stale fallback인지 recoverable error인지 나눈다. 날씨 앱에서 이 정직함은 기능만큼 중요했다.

다음에 비슷한 프로젝트를 한다면 처음부터 이렇게 말할 것 같다.

> 서버 상태는 캐시고, 사용자에게 보여줄 수 있는 오래된 데이터는 제품 계약이다. 둘을 섞지 말자.

## 참고한 회고 형식

- [Ssemtle 프로젝트 회고 (기술편)](https://medium.com/@sdgwsld/ssemtle-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%ED%9A%8C%EA%B3%A0-%EA%B8%B0%EC%88%A0%ED%8E%B8-ba66409cf3d8)
- [Vridge MVP 회고](https://medium.com/@sdgwsld/vridge-mvp-%ED%9A%8C%EA%B3%A0-611796034203)

## 주요 코드/문서 근거

- `README.md`
- `docs/specs.md`
- `docs/specs-favorites.md`
- `docs/taskmap.md`
- `docs/Design.md`
- `docs/assets-current-state.md`
- `docs/skills/search-and-location-resolution.md`
- `docs/skills/weather-domain-contracts.md`
- `docs/skills/favorites-behavior.md`
- `docs/skills/asset-manifest-contract.md`
- `frontend/entities/location/model/search.ts`
- `frontend/entities/location/model/location-resolution.ts`
- `frontend/features/current-location/model/current-location-service.ts`
- `frontend/features/app-bootstrap/use-home-bootstrap.ts`
- `frontend/features/app-bootstrap/use-detail-bootstrap.ts`
- `frontend/features/favorites/use-favorites.ts`
- `frontend/features/favorites/use-refresh-queue.ts`
- `frontend/entities/asset/model/selector.ts`
- `frontend/entities/asset/api/load-session-manifest.ts`
- `frontend/shared/lib/storage/versioned-storage.ts`
- `tests/search-page.test.tsx`
- `tests/location-resolution.test.ts`
- `tests/home-bootstrap.test.ts`
- `tests/use-detail-bootstrap.test.ts`
- `tests/use-favorites.test.ts`
- `tests/favorites-page.test.tsx`
- `tests/asset/manifest.test.ts`
