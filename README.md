# Weatherpane

대한민국 지역을 대상으로 하는 React + TypeScript + Tailwind 날씨 앱이다.
오프라인·불안정 네트워크에서도 스냅샷 기반으로 날씨 정보를 제공한다.

---

## 1. 프로젝트 설정

### 사전 요구 사항

- Node.js 20 이상
- pnpm 9 이상

### 설치

```bash
git clone <repo-url>
cd weatherpane
pnpm install --frozen-lockfile
```

### 환경 파일 설정

```bash
cp .env.example .env
# .env 파일을 열어 필요한 값을 입력한다
```

---

## 2. 환경 변수 설정

| 변수                         | 필수 여부           | 설명               |
| ---------------------------- | ------------------- | ------------------ |
| `VITE_WEATHER_PROVIDER_MODE` | 필수                | `mock` 또는 `real` |
| `VITE_OPENWEATHER_API_KEY`   | `real` 모드 시 필수 | OpenWeather API 키 |

프로덕션 빌드에서 `VITE_WEATHER_PROVIDER_MODE`가 설정되지 않거나 잘못된 값이면
앱은 데모 모드로 조용히 폴백하지 **않는다** — 명시적 설정 오류 화면을 표시한다.

---

## 3. Mock vs Real 프로바이더 모드

### Mock 모드 (기본값)

API 키 없이 즉시 실행 가능. 하드코딩된 날씨 데이터(서울, 17.2°C, 맑음)를 반환한다.

```bash
# .env
VITE_WEATHER_PROVIDER_MODE=mock
```

### Real 모드

OpenWeather API에 실제 요청을 보낸다. API 키가 필요하다.

```bash
# .env
VITE_WEATHER_PROVIDER_MODE=real
VITE_OPENWEATHER_API_KEY=your_key_here
```

### 개발 중 빠른 전환

개발 서버 실행 중 앱 화면 우하단에 **개발 전용 토글 버튼**이 표시된다.
클릭하면 `__wp_dev_provider_mode` (localStorage)를 업데이트하고 페이지를 재로드한다.
프로덕션 빌드에서는 이 버튼이 렌더링되지 않는다.

---

## 4. 테스트 명령어

### 단위 및 통합 테스트 (Vitest)

```bash
# 전체 단위/통합 테스트 실행
pnpm test:unit

# 특정 파일만 실행
pnpm exec vitest run tests/env-config.test.ts

# 감시 모드
pnpm exec vitest
```

### E2E 테스트 (Playwright)

E2E 테스트는 mock 모드에서 실행된다. 실제 API 키 불필요.

```bash
# 전체 E2E 실행
pnpm test:e2e

# 특정 시나리오만 실행
pnpm exec playwright test tests/theme-smoke.e2e.ts

# UI 모드로 실행 (디버깅)
pnpm exec playwright test --ui

# 트레이스 뷰어
pnpm exec playwright show-trace test-results/<trace>.zip
```

### 전체 검증 체인

```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:e2e
```

---

## 5. 빌드 및 배포

### 개발 서버

```bash
pnpm dev
# http://localhost:5173
```

### 프로덕션 빌드

```bash
VITE_WEATHER_PROVIDER_MODE=real \
VITE_OPENWEATHER_API_KEY=your_key \
pnpm build
```

### 로컬 프리뷰

```bash
pnpm preview
# http://localhost:4173
```

### 정적 호스팅

`build/client/` 디렉터리를 정적 호스트(Vercel, Netlify, S3 등)에 배포한다.
SPA 라우팅을 위해 모든 경로를 `index.html`로 폴백하도록 호스트를 설정한다.

React Router SSR을 활성화한 경우, `pnpm start`로 Node.js 서버를 실행한다.

---

## 6. 아키텍처 요약

### Feature-Sliced Design (FSD)

```text
frontend/
├── app/          전역 프로바이더, 글로벌 스타일, 앱 런타임 구성
├── pages/        페이지 단위 UI (home, search, location, favorites)
├── features/     기능 레이어 (favorites, recents, search, weather-queries 등)
├── entities/     도메인 엔티티 (weather, aqi, location, asset)
└── shared/       공용 UI 컴포넌트, 훅, 유틸리티, 스토리지 레포지터리

app/              React Router 진입점과 라우트 모듈
tests/            Vitest 단위 테스트 + Playwright E2E 스모크 테스트
```

레이어 경계 규칙: 하위 레이어는 상위 레이어를 import할 수 없다.
공용 기본 요소는 `shared/`에, 도메인/비즈니스 로직은 `entities/features/`에 배치한다.

---

## 7. 주요 기술 결정

### TanStack Query (서버 상태 관리)

날씨·AQI 데이터는 TanStack Query로 관리한다. staleTime 10분(날씨) / 30분(AQI),
1회 재시도, 포커스 시 오래된 데이터 재페치. 세션 간 캐시를 영속화하지 않는다.

### Feature-Sliced Design

기능 경계를 명확히 하고 교차 기능 임포트를 방지하기 위해 FSD를 사용한다.
프로바이더 응답 형태를 UI에 노출하지 않고 정규화된 앱 모델을 사용한다.

### 한국 카탈로그 기반 위치 해석

위치 검색과 역지오코딩은 대한민국 행정구역 카탈로그(`catalog.generated.json`)에
대조하여 처리한다. 카탈로그 외 위치(국외 등)는 지원되지 않음으로 표시한다.

### 스냅샷 기반 오프라인 폴백

날씨 요청 성공 시 localStorage에 스냅샷을 저장한다(날씨 24시간, AQI 12시간 유효).
오프라인 상태에서 신선한 스냅샷이 있으면 오래됨(stale) 배지와 함께 표시한다.
스냅샷이 없거나 만료된 경우 복구 가능한 오류 UI를 표시한다.

### 스케치 에셋 시스템

날씨 상태(맑음/비/눈 등)와 주야에 따라 의미론적 키(`hub/seoul/clear-day` 등)로
에셋을 참조한다. 베이스라인 매니페스트가 앱과 함께 번들되며, 원격 매니페스트로
세션 갱신 없이 오버라이드할 수 있다.
