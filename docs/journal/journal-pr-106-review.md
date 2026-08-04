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

- `gh pr view 106 --json number,url,headRefName,baseRefName,body`를 실행했다. 결과는 PR `106`, head `chore/80-search-catalog-load-performance`, base `main`, URL `https://github.com/cgm-16/weatherpane/pull/106`이었고, 반환된 body의 `Linked issue` 절은 `Closes #80`이었다.
- 해당 PR 브랜치에서 `gh-address-comments` 스킬의 `scripts/fetch_comments.py`를 실행하고 `isResolved == false && isOutdated == false`로 필터링했다. 전체 인라인 스레드 5개 중 미해결 스레드는 2개였고, 둘 다 `docs/journal/journal-pr-106-review.md`를 가리켰다.
- `git merge-base --is-ancestor origin/main HEAD`의 종료 코드는 `0`이었다. `git diff --name-only --diff-filter=U` 출력은 비어 있어 `fd207c3`에서 `main` 통합과 충돌 해결이 완료됐음을 확인했다.
- `! rg -n 'docs/prompt\.md' docs/skills/search-and-location-resolution.md`의 종료 코드는 `0`이었다. 현재 검색 스킬에는 문제의 링크가 없으므로, 링크가 남아 있다는 기존 저널 문구를 제거했다.

## 재현 가능한 검증 증거

- `pnpm exec vitest run tests/catalog-lookup-artifact.test.ts tests/catalog-generation.test.ts tests/search-catalog-engine.test.ts` — 종료 코드 `0`, 테스트 파일 3개와 테스트 76개 통과.
- `pnpm exec vitest run tests/client-bundle-budget.test.ts tests/client-bundle-generated-files.test.ts tests/client-bundle-report.test.ts` — 종료 코드 `0`, 테스트 파일 3개와 테스트 33개 통과.
- `pnpm exec vitest run tests/production-server-entrypoint.test.ts tests/client-bundle-budget.test.ts` — 종료 코드 `0`, 테스트 파일 2개와 테스트 43개 통과. 충돌 지점에서 보존한 두 CI 게이트의 직접 동작을 함께 확인했다.
- `CATALOG_BUNDLE_REPORT=1 VITE_WEATHER_PROVIDER_MODE=mock pnpm build` — 종료 코드 `0`, client 296개 모듈과 SSR 118개 모듈 변환 완료. 500 kB 초과 청크 경고는 출력됐지만 빌드는 성공했다.
- `test -f build/catalog-bundle-report.json && test ! -e build/client/catalog-bundle-report.json` — 종료 코드 `0`. 보고서는 배포 대상인 `build/client` 밖에만 존재했다.
- `pnpm check:bundle-budget` — 종료 코드 `0`. Search raw `2,208,922 / 2,319,078 bytes`, Search gzip `482,305 / 506,304 bytes`, Detail raw `1,427,999 / 1,499,419 bytes`, Detail gzip `270,392 / 283,909 bytes`였고, 전체 카탈로그 제외와 Search/Detail 경로 격리 검사가 통과했다.
- 각 결함의 회귀 테스트와 구현 변경은 아래 커밋에서 파일 단위로 함께 확인할 수 있다. 현재 통과 결과는 위 명령으로 재현한다. 당시 RED 콘솔 출력은 저장된 아티팩트가 없어 테스트 우선 순서의 검증 근거로 주장하지 않는다.

## 커밋

- `3e56950` `fix(catalog): 조회 산출물 검증과 ID 검색 보강`
- `ffe1610` `fix(bundle): 경로 격리와 생성 예산 검증 보강`
- `c798e0b` `fix(bundle): 생성 파일 로딩과 예산 보정 보호`
- `50cd89d` `fix(bundle): 진단 보고서를 배포 산출물에서 분리`
- `3da2f1b` `test(search): 인기 지역 조회 상한을 입력 수에 맞춤`
- `955b513` `fix(bundle): null 예산 파일을 누락으로 처리하지 않음`

## 남은 증거와 외부 상태

- Vite 생산 빌드는 500 kB 초과 청크 경고를 출력한다. 위 build 명령의 종료 코드는 `0`이다.
- `pnpm check:bundle-budget`은 종료 코드 `0`이지만 `EMFILE: too many open files, watch` 경고를 반복 출력하므로 깨끗한 출력은 아니다.
- PR 브랜치에서 `pnpm exec playwright test tests/search-page.e2e.ts`를 실행했을 때 첫 실행은 React Router `/__manifest` 요청의 `net::ERR_ABORTED`와 `Failed to fetch manifest patches`로 1개 실패, 2개 통과했다. 같은 브랜치에서 `pnpm exec playwright test tests/search-page.e2e.ts --workers=2 --repeat-each=5 --reporter=line`을 실행한 결과는 15개 통과였다.
- 현재 `origin/main`의 detached worktree에서 같은 5회 반복 명령을 실행한 결과도 같은 첫 번째 테스트와 같은 매니페스트 오류로 1개 실패, 14개 통과였다. `git diff origin/main..HEAD -- tests/search-page.e2e.ts tests/fixtures.ts`에서 PR 차이는 해당 테스트의 내비게이션 전 단언 3개뿐이므로, 이 비결정적 teardown 경합은 PR 106이 만든 회귀가 아니다. 이슈 #80 범위를 넓혀 수정하지 않는다.
- `git diff --name-only 72c0124..HEAD -- 'frontend/entities/location/*.generated.json'` 출력은 비어 있어 리뷰 수정과 `main` 통합이 생성 카탈로그 JSON 내용을 바꾸지 않았음을 확인했다.
- GitHub 리뷰 답글 작성과 스레드 해결은 별도 원격 쓰기이므로 이 작업 범위에 포함하지 않았다.
