# PR 106 리뷰 수정 설계

## 목표

PR 106의 검증된 리뷰 피드백을 최소 변경으로 반영해 카탈로그 조회와 번들 예산 검사를 fail-closed로 만들고, 번들 진단 보고서가 일반 배포 산출물에 포함되지 않도록 한다.

## 선택한 접근

기존 카탈로그 산출물과 번들 예산 모듈의 경계를 유지하면서 각 결함이 발생한 함수만 보강한다.

- lookup 산출물의 ID와 entry 개수를 함께 검증한다.
- 기본 ID 조회는 12자 길이를 확인한 뒤 정렬된 위치의 `indexOf` 결과만 사용한다.
- 경로 격리는 첫 번째 청크가 아니라 해당 모듈을 포함한 모든 청크를 검사한다.
- 생성 예산의 버전과 baseline을 런타임에 검증하고, 검증된 baseline을 증거 계산에 전달한다.
- 생성 JSON 로더는 누락되거나 잘못된 파일을 prerequisite 명령이 포함된 오류로 바꾼다.
- 보정은 기존 측정값이나 한도가 증가하면 명시적 `--allow-increase` 없이는 중단한다.
- 번들 보고서는 명시적으로 활성화한 빌드에서만 생성하고 `build/client` 밖에 기록한다.

### 검토했지만 선택하지 않은 접근

1. 번들 예산 도구를 별도 패키지나 클래스 계층으로 재구성하는 방식은 현재 결함을 고치는 데 필요하지 않아 제외한다.
2. CI가 검사 후 보고서를 삭제하는 방식은 일반 로컬·배포 빌드가 계속 보고서를 생성하고 gzip 비용을 지불하므로 제외한다.
3. 보정 파일에 커밋 SHA나 임의의 build provenance 스키마를 추가하는 방식은 dirty tree와 외부 빌드의 의미를 정의하지 못하므로 제외한다.

## 상세 설계

### 카탈로그 lookup

`frontend/entities/location/model/catalog-artifacts.ts`에 lookup 산출물 정합성을 검사하는 함수를 둔다. 이 함수는 `ids.length === total * 12`와 `entries.length === total`을 모두 확인하고, 실패하면 기존 `catalog-lookup` 오류 계열로 중단한다. `catalog-lookup.ts`는 기본 JSON을 이 함수로 검증한 뒤 사용한다.

기본 ID 조회는 입력이 정확히 12자가 아니면 `null`을 반환한다. `ids.indexOf(catalogLocationId)` 결과가 12자 경계에 있을 때만 entry index로 변환하며, 먼저 발견한 값이 경계 밖이면 다음 일치 위치를 계속 찾는다. 사용자 지정 `LocationCatalog` 조회 경로는 바꾸지 않는다.

### 번들 경로 격리와 예산 검증

`scripts/client-bundle-budget.ts`는 모듈 suffix를 포함하는 모든 청크 파일명을 수집한다. Detail의 도달 가능 집합과 모든 Search 산출물 청크의 교집합, Search의 도달 가능 집합과 모든 lookup 산출물 청크의 교집합 중 하나라도 비어 있지 않으면 기존 오류 문구로 실패한다.

생성 예산 검증은 다음 순서로 fail-closed 동작한다.

1. `version === 1` 확인
2. 생성 파일의 `baseline`이 코드의 기준값과 일치하는지 확인
3. `headroomRatio` 확인
4. 측정값에서 파생한 raw/gzip 공식 확인

검증 결과는 한도와 검증된 baseline을 함께 반환한다. 경로 증거 계산은 전달받은 baseline으로 delta와 감소율을 계산한다.

### 생성 파일 로딩과 보정

공유 로더는 파일 읽기와 JSON 파싱을 한 경계에서 처리한다. 누락과 malformed JSON 모두 파일 경로와 먼저 실행할 명령을 포함한 단일 Korean 오류로 변환한다. 검사는 보고서와 생성 예산 파일에 이 로더를 사용한다. 보정은 보고서에 이 로더를 사용하고, 기존 예산 파일은 최초 생성만 허용하기 위해 `ENOENT`일 때만 `null`로 취급한다. 기존 파일이 malformed이면 보정을 중단한다.

보정 전 기존 예산과 새 예산을 비교한다. Search와 lookup 각각의 measured raw/gzip 및 파생 raw/gzip 중 하나라도 증가하면 `--allow-increase`가 없는 실행을 거부한다. 감소하거나 동일한 값은 기존 명령으로 갱신할 수 있다. provenance 필드는 추가하지 않는다.

### 번들 보고서 출력

`clientBundleReportPlugin`은 `CATALOG_BUNDLE_REPORT=1`이고 client environment인 경우에만 적용한다. 보고서는 `writeBundle`에서 `build/catalog-bundle-report.json`으로 기록해 `build/client` 정적 배포 트리에서 분리한다. 청크 변환 입력 타입은 Vite가 내보내는 `Rollup.OutputChunk`를 사용한다.

CI의 기존 production build 단계는 `CATALOG_BUNDLE_REPORT=1`을 설정한 채 한 번만 빌드하고, 이어지는 leak 검사와 예산 검사가 같은 산출물을 사용한다. 일반 `pnpm build`는 보고서를 만들지 않는다. `docs/performance/search-catalog-load-budget.md`는 새 경로와 활성화 명령, 의도적인 증가 시 override 명령을 설명한다.

## 오류 처리

- lookup 산출물 구조가 잘못되면 앱 모듈 로딩 시 명시적인 artifact 오류로 중단한다.
- 필요한 생성 파일이 없거나 JSON이 잘못되면 Node stack trace 대신 prerequisite 명령을 포함한 오류를 던진다.
- 보정 증가가 감지되면 변경된 route와 byte 종류를 명시하고 `--allow-increase` 사용법을 안내한다.
- 경로 격리 오류 문구와 예산 초과 오류 문구는 기존 계약을 유지한다.

## 테스트 전략

각 동작 변경은 RED를 먼저 확인한다.

- lookup 산출물의 `entries.length` 불일치가 명시적 오류를 내는 테스트
- 두 번째 Search/lookup 산출물 청크가 반대 route에서 도달 가능할 때 실패하는 테스트
- 잘못된 version과 baseline을 각각 거부하고 검증된 baseline으로 증거를 계산하는 테스트
- 비어 있는 보고서, 누락된 Detail route와 Search 산출물, 각 route가 자기 산출물에 도달하지 못하는 모든 fail-closed 테스트
- 누락·malformed 생성 파일이 prerequisite 명령을 포함한 오류를 내는 테스트
- 증가 보정은 기본 거부되고 override에서는 허용되는 테스트
- 보고서 플러그인의 opt-in 조건과 배포 트리 밖 출력 경로 테스트
- 인기 지역 segment read 상한을 `POPULAR_LOCATIONS.length`와 이름 있는 경로당 상수에서 계산하도록 변경

구현 단위마다 관련 Vitest 파일을 실행한다. 최종 검증은 lint, typecheck, 전체 unit/integration 테스트, production build, bundle budget 검사, `git diff --check`를 포함한다. UI 흐름은 바뀌지 않으므로 Playwright와 스크린샷은 적용 대상이 아니다.

## 비범위

- Detail bootstrap 테스트 이름 변경
- build provenance 스키마 추가
- 검색 순위, URL/IME, 위치 선택 규칙 변경
- 카탈로그 항목 또는 생성 데이터 내용 변경
- GitHub 리뷰 답글 작성이나 스레드 해결
