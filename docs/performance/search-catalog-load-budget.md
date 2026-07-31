# 검색 카탈로그 로드 예산

## 목적과 범위

이 예산은 Search와 Detail의 카탈로그 보유 JavaScript chunk만 검사한다. 전체 페이지 전송량 예산이 아니다. `material-symbols-outlined` 폰트의 3,903,352 bytes는 이 이슈와 무관하므로 범위에 포함하지 않는다.

변경 전에는 8,733,640 raw bytes / 847,465 gzip bytes인 전체 카탈로그 chunk를 Search와 cold Detail이 모두 도달했다. 현재 생산 빌드에서는 Search가 Search 산출물만, Detail이 lookup 산출물만 도달한다. 어떤 클라이언트 chunk도 `catalog.generated.json`을 포함하면 안 된다.

## 측정값과 한도

측정은 최종 mock 생산 빌드의 `build/client/catalog-bundle-report.json`을 사용한다. 이 보고서는 chunk code의 `Buffer.byteLength`와 `gzipSync(code).byteLength`를 기록하므로 Vite 화면의 kB 단위 표기가 아닌 재현 가능한 byte 단위다.

| 대상            |  측정 raw | 측정 gzip |  raw 한도 | gzip 한도 |
| --------------- | --------: | --------: | --------: | --------: |
| Search 카탈로그 | 2,208,645 |   482,194 | 2,319,078 |   506,304 |
| Detail 조회     | 1,428,018 |   270,389 | 1,499,419 |   283,909 |

각 한도는 `Math.ceil(measuredBytes * 1.05)`로 계산한다. 5% 여유는 minifier 또는 compressor의 비의미적 작은 변동을 흡수한다. 이보다 큰 증가는 재보정과 리뷰가 필요하며, 한도 JSON의 저장 값이 이 공식과 다르면 검사가 실패한다.

동일한 이전 baseline과 비교하면 Search는 raw 74.71%, gzip 43.10% 감소했고 Detail lookup은 raw 83.65%, gzip 68.09% 감소했다. 감소율은 전체 경로 전송량이 아니라 카탈로그 보유 chunk의 raw/gzip byte 차이만 의미한다.

## 경로 격리

- Detail route는 `catalog.search.generated.json`에 도달하면 안 된다.
- Search route는 `catalog.lookup.generated.json`에 도달하면 안 된다.
- `catalog.generated.json`은 모든 클라이언트 chunk에서 제외되어야 한다.

Search는 동기적으로 검색 가능한 compact tuple만 사용하고, 선택된 tuple 하나만 필요할 때 재구성한다. Cold Detail은 별도의 경량 lookup 산출물로 한 항목을 재구성한다. 이 분리는 URL, 300 ms IME debounce, 검색 순위, 지원하지 않는 위치 처리 규칙을 바꾸지 않는다.

## 실행과 증거

```bash
VITE_WEATHER_PROVIDER_MODE=mock pnpm build
pnpm calibrate:bundle-budget
pnpm check:bundle-budget -- --prove-red
pnpm check:bundle-budget
```

마지막 검사는 위 실제 값을 출력하고 전체 카탈로그 제외와 양방향 경로 격리를 확인한다. `--prove-red`는 메모리에서 Search/Detail의 raw/gzip 한도를 각각 실제 값보다 1 byte 낮춰 네 번의 실패를 확인한 뒤, 파일을 변경하지 않고 커밋된 한도로 GREEN을 다시 확인한다.

로컬 Chromium 타이밍은 코드 파싱/실행 변화를 살피는 진단 자료일 뿐, 현장 RUM 또는 사용자 백분위 성능 증거가 아니다. 이 문서는 그 타이밍을 제품 성능 지표로 주장하지 않는다.
