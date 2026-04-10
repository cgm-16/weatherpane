# Weatherpane

Weatherpane는 대한민국 지역을 대상으로 하는 React + TypeScript + Tailwind 날씨 앱이다.

현재 베이스라인은 다음 원칙으로 구성되어 있다.

- 저장소 `app/`은 React Router 프레임워크 진입점과 라우트 어댑터만 담당한다.
- 실제 앱 코드는 `frontend/` 아래의 Feature-Sliced Design 레이어에 배치한다.
- 전역 provider와 글로벌 스타일은 `frontend/app`에 둔다.
- 테스트 하니스는 Vitest와 Playwright를 사용한다.

## 시작하기

### 설치

```bash
pnpm install --frozen-lockfile
```

### 개발 서버

```bash
pnpm dev
```

기본 개발 서버는 `http://localhost:5173`에서 실행된다.

## 기본 스크립트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm preview
```

## 디렉터리 구조

```text
app/                 React Router 프레임워크 진입점과 라우트 모듈
frontend/app/        provider, 글로벌 스타일, 앱 런타임 구성
frontend/pages/      페이지 단위 UI
frontend/widgets/    위젯 레이어
frontend/features/   기능 레이어
frontend/entities/   도메인 엔티티 레이어
frontend/shared/     공용 UI/유틸리티
tests/               Vitest 및 Playwright smoke 테스트
```
