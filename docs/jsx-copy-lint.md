# JSX 문구 검사

`pnpm lint`는 `weatherpane/korean-jsx-text` 규칙으로 `frontend/`와 `app/`의 JSX/TSX 텍스트 노드를 검사합니다. 스토리와 테스트 파일은 제외합니다. 구두점, 축약형, 밑줄, 줄바꿈, HTML 엔티티가 포함된 영문도 오류로 보고하며, 한국어 문장에 섞인 미허용 영문도 검사합니다.

## 허용 범위

- 기술 토큰: `Weatherpane`, `API`, `AQI`, `URL`, `H`, `L`, `CONNECTION_FAILED`. 전체 토큰이 정확히 일치해야 합니다.
- 아이콘: `scripts/eslint/korean-jsx-text.ts`의 알려진 아이콘 이름만 허용합니다. 바로 위 JSX 요소의 `className`의 문자열 리터럴에 `material-symbols-outlined`가 있어야 합니다(배열을 `join`하는 기존 표현식 포함). 일반 문구나 임의의 밑줄 문자열은 아이콘으로 취급하지 않습니다.
- 숫자, 기호, 한국어 문구는 그대로 허용합니다.

이 규칙은 영문 회귀 방지용으로, 번역 품질이나 모든 언어를 판별하지 않습니다. JSX 속성, 문자열 표현식, 변수·함수에서 공급하는 문구는 `JSXText`가 아니므로 검사하지 않습니다. 새로운 기술 토큰이나 아이콘이 필요하면 근거와 RuleTester 사례를 함께 추가합니다.

기존 영문 버튼 `Open Settings`, `Try Again`, `Go to Saved Places`는 [이슈 #152](https://github.com/cgm-16/weatherpane/issues/152)에서 정리합니다. 해당 텍스트 노드에만 인라인 예외를 적용했으며, 같은 파일의 새로운 영문 문구는 계속 오류로 보고합니다. 문구를 수정할 때 예외도 제거합니다.

## 검증

`pnpm exec vitest run tests/jsx-copy-rule.test.ts`는 RuleTester 사례, 실제 flat config 연결, 현재 앱 전체의 오탐 및 불필요한 예외 여부를 검증합니다. `pnpm lint`와 `pnpm typecheck`도 함께 실행합니다. 이 규칙은 런타임이나 화면 동작을 변경하지 않습니다.
