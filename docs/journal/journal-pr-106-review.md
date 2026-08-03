# PR 106 리뷰 후속 작업

## 목표

- PR 106의 실행 가능한 리뷰 피드백을 저장소 기준으로 검증하고, 선택한 범위를 작은 TDD 단위로 반영한다.

## 선택한 범위

- lookup 산출물의 `total`, 고정 폭 ID, `entries` 개수를 함께 검증한다.
- 모든 검색/조회 카탈로그 보유 청크를 대상으로 라우트 격리를 검사한다.
- 번들 보고서를 명시적으로 활성화한 빌드에서만 만들고 `build/client` 밖에 기록한다.
- 기본 lookup 검색을 고정 폭 경계에 맞춘 `indexOf`로 변경한다.
- 생성 JSON 오류에 파일 경로와 선행 명령을 포함한다.
- 기존 측정값이나 한도의 증가는 `--allow-increase` 없이는 보정하지 않는다.
- 생성 예산의 `version`과 `baseline`을 검증하고, 검증된 baseline으로 증거를 계산한다.
- fail-closed 분기와 인기 지역 조회 상한의 의도를 테스트로 고정한다.
- Rollup의 `OutputChunk` 타입을 직접 사용한다.

Detail bootstrap 테스트 이름 변경과 build provenance 스키마 추가는 범위에서 제외했다. provenance는 dirty tree와 외부 빌드의 의미가 정의되지 않아 신뢰할 수 있는 검증 근거가 되지 않는다.

## 확인된 사실

- PR 106은 이슈 #80, 브랜치 `chore/80-search-catalog-load-performance`와 연결되어 있다.
- 확인 당시 해결되지 않았고 outdated가 아닌 인라인 스레드는 3개였다.
- 변경 전 번들 경로 격리 검사는 같은 검색 카탈로그 모듈을 가진 두 번째 청크가 Detail에서 도달 가능해도 통과했다.
- 변경 전 생성 예산 검증은 공식만 맞으면 잘못된 `version`과 `baseline`을 허용했다.
- lookup 성능 진단에서 500회 미스/마지막 ID 조회 기준 aligned `indexOf`가 `slice` 순회보다 약 4~12배 빨랐다.
- 인기 지역 10개 조회는 42회의 segment read를 사용하며, 파생 상한은 `POPULAR_LOCATIONS.length * 4 * 2`다.
- `docs/skills/search-and-location-resolution.md`가 가리키는 `docs/prompt.md`는 존재하지 않고 원본은 `docs/legacy/prompt.md`로 보관되어 있다. 이번 범위에서는 수정하지 않았다.

## RED/GREEN 증거

- lookup `entries.length` 불일치 테스트는 기존 코드에서 모듈 import가 성공해 RED였고, 공용 validator 추가 후 generation 포함 60개 테스트가 통과했다.
- 고정 폭 레코드 경계 문자열 테스트는 refactor 전후 모두 통과했고, lookup/search 집중 테스트 76개가 통과했다.
- 중복 카탈로그 청크 누출 테스트는 기존 첫 청크 검사에서 RED였고, 전체 산출물 집합 검사 후 GREEN이었다.
- 생성 예산의 잘못된 version, baseline, 반환 shape 테스트 3개가 RED였고, 검증 결과를 `{ baseline, limits }`로 바꾼 뒤 GREEN이었다.
- 사용자 지정 baseline 증거 테스트는 모듈 상수 사용으로 RED였고, baseline 전달 후 GREEN이었다.
- 생성 파일 테스트 4개는 공용 로더가 없어 RED였고, strict/optional 로더 추가 후 GREEN이었다.
- Search/lookup의 measured raw/gzip 및 limit raw/gzip 증가 테스트 8개와 override 테스트 1개가 guard 부재로 RED였고, anti-ratchet 추가 후 GREEN이었다.
- 보고서 opt-in 테스트는 client 빌드에 항상 적용되어 RED였고, `CATALOG_BUNDLE_REPORT=1` 조건 추가 후 GREEN이었다.
- 보고서 배치 테스트는 `generateBundle` asset emission 때문에 RED였고, `writeBundle`로 `build/catalog-bundle-report.json`을 기록한 뒤 GREEN이었다.
- 일반 mock 생산 빌드는 보고서를 만들지 않았고, 활성화한 mock 생산 빌드는 root 보고서만 만들었다. budget gate는 종료 코드 0이었다.

## 커밋

- `3e56950` `fix(catalog): 조회 산출물 검증과 ID 검색 보강`
- `ffe1610` `fix(bundle): 경로 격리와 생성 예산 검증 보강`
- `c798e0b` `fix(bundle): 생성 파일 로딩과 예산 보정 보호`
- `50cd89d` `fix(bundle): 진단 보고서를 배포 산출물에서 분리`
- `3da2f1b` `test(search): 인기 지역 조회 상한을 입력 수에 맞춤`

## 남은 증거와 외부 상태

- Vite 생산 빌드는 기존 500 kB 초과 청크 경고를 출력한다.
- `pnpm check:bundle-budget`은 종료 코드 0이지만 기존 `EMFILE` watcher 경고를 반복 출력하므로 깨끗한 출력은 아니다.
- UI 동작은 변경하지 않아 Playwright와 스크린샷은 필요하지 않다.
- 생성 카탈로그 JSON 내용은 변경하지 않았다.
- GitHub 리뷰 답글 작성, 스레드 해결, push는 수행하지 않았다.
