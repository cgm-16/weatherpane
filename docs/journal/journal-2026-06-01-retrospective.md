# 2026-06-01 프로젝트 회고 조사 메모

## 작업 범위

- 목표: Weatherpane 프로젝트의 구조, 핵심 비즈니스 로직, pain point, solution을 근거 기반으로 정리한 Medium용 한국어 회고 초안 작성.
- 이슈: https://github.com/cgm-16/weatherpane/issues/71
- 브랜치: `docs/71-project-retrospective`
- 작업 위치: `.worktrees/docs-71-project-retrospective`

## 레퍼런스 글에서 확인한 구조

- Ssemtle 회고: 지표 요약, 주요 기여사항, 핵심 기능, 아키텍처, 인프라/CI, 성과, 기술적 도전과 해결책, 역할 중심.
- Vridge 회고: 프로젝트 요약, 철학, 기술 스택/패턴, 상태 분리, DX, 잘한 점, 개선 가능한 점, 아키텍처 교훈 중심.
- Weatherpane 회고에는 두 구조를 섞되, 단순 기능 나열보다 `문제 -> 설계 선택 -> 구현 결과 -> 남은 한계`의 흐름을 우선 적용한다.

## 조사 중 유지할 원칙

- 추측으로 기능을 설명하지 않고, 문서/테스트/소스 중 최소 하나의 근거를 확인한다.
- 검색, 위치 해소, 날씨 질의, 즐겨찾기, 저장소, 자산, 테마, 테스트 전략을 빠뜨리지 않는다.
- UI나 동작을 변경하지 않는다.

## 확인한 프로젝트 수치

- 현재 HEAD 기준 커밋 수: 249개.
- task 문서: 22개.
- 테스트 파일: 59개. Vitest 대상은 50개 파일/486개 테스트가 통과.
- Playwright E2E 파일: 8개.
- 라우트 파일: 6개.
- 위치 카탈로그: 20,556개 항목.
- 스케치 WebP 에셋: 22개.

## 구현 구조 메모

- `frontend/`는 FSD 구조를 따른다. `pages`는 화면 조립, `features`는 사용자 동작/상태, `entities`는 위치/날씨/AQI/자산 도메인, `shared`는 스토리지와 공용 UI/훅이다.
- 라우팅은 React Router가 담당한다. `/`, `/search`, `/favorites`, `/location/:resolvedLocationId`, `/v1/assets/manifest`가 현재 핵심 표면이다.
- 초기 명세에는 서비스 워커, REST 즐겨찾기 API, IndexedDB 전제도 있으나 현재 구현은 localStorage/sessionStorage 기반 명시적 저장소와 TanStack Query 런타임 캐시 중심이다. 회고에서는 "구현된 MVP"와 "초기 확장 구상"을 분리해야 한다.

## 기능별 핵심 pain point와 solution 초안

- 검색: 한국어 행정구역 이름은 중복과 접미사 변형이 많고, URL 상태를 바로 input value로 쓰면 IME 조합 중 자모 분리 문제가 생긴다. 해결은 로컬 카탈로그 검색, 좁은 접미사 생략, NFC 정규화, inputValue와 URL 쿼리의 300ms 디바운스 분리.
- 위치 해소: 검색 결과가 곧바로 날씨 API 좌표가 되지 않는다. 해결은 수동 오버라이드 -> OpenWeather 지오코딩 -> unsupported session token 순서의 파이프라인.
- 현재 위치: 브라우저 geolocation은 권한/타임아웃/역지오코딩 실패가 모두 가능하다. 해결은 8초 타임아웃, KR 후보 필터링, catalog canonicalization, 실패 시 raw GPS fallback과 recovery reason 분리.
- 날씨/AQI: provider 응답을 UI에 노출하면 교체와 테스트가 어렵다. 해결은 OpenWeather 응답을 `CoreWeather`와 `Aqi`로 정규화하고 provider interface 뒤에 mock/real을 숨긴다.
- 서버 상태: 날씨는 최신성이 필요하지만 세션 간 캐시 지속은 위험하다. 해결은 TanStack Query를 런타임 캐시로만 쓰고, 사용자에게 보여줄 수 있는 fallback은 별도 versioned snapshot repository에 저장한다.
- 오프라인/불안정 네트워크: 실패 화면만 보여주면 앱의 핵심 가치가 사라진다. 해결은 날씨 24시간/AQI 12시간 cutoff의 명시적 stale fallback과 recoverable error 분기.
- 즐겨찾기: 저장 위치는 수동 순서, 닉네임, undo, 카드 상태까지 결합되어 작은 CRUD보다 복잡하다. 해결은 6개 cap, 수동 order persistence, 최신 제거 1건 undo, 20자 닉네임 hard cap, 편집/정렬 모드 gating.
- 즐겨찾기 카드 갱신: 여러 카드가 동시에 fetch되면 중복 요청과 실패 폭주가 생긴다. 해결은 stale 카드만 골라 concurrency 2로 refetch하고 같은 패스에서 queue-level retry를 하지 않는다.
- 자산: 날씨 상태와 지역별 이미지를 컴포넌트가 직접 파일 경로로 알면 확장과 교체가 어렵다. 해결은 semantic key, baseline manifest, next-session remote override, override 실패 시 baseline fallback.
- 테마: FOUC와 hydration 전 클릭 경쟁이 생길 수 있다. 해결은 root inline init script, class-based dark mode, versioned theme repository, session/local 동시 저장.
- 테스트: 흐름이 저장소/네트워크/라우팅에 걸쳐 있어 단위 테스트만으로는 부족하다. 해결은 Vitest 50개 파일과 Playwright 8개 smoke로 계약을 분산 검증한다.

## 범위 밖 발견

- `git push` 출력에서 GitHub가 default branch 기준 의존성 취약점 12건(High 2, Moderate 9, Low 1)을 보고했다. 이번 회고 문서 작업 범위는 아니므로 수정하지 않는다. 필요하면 별도 보안/의존성 점검 이슈로 다뤄야 한다.
