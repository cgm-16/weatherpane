# 에셋 현황 및 제한사항

## 베이스라인 매니페스트 상태

`scripts/stitch/sketch-batch.json`이 정의한 시맨틱 키 목록과 현재 생성된 에셋의 상태를 정리한다.

## 현재 에셋 목록

베이스라인 매니페스트는 다음 22개의 시맨틱 키를 포함한다.

### hub/seoul (8개)

- hub/seoul/clear-day
- hub/seoul/clear-night
- hub/seoul/cloudy-day
- hub/seoul/cloudy-night
- hub/seoul/rainy-day
- hub/seoul/rainy-night
- hub/seoul/snowy-day
- hub/seoul/snowy-night

### hub/busan (8개)

- hub/busan/clear-day
- hub/busan/clear-night
- hub/busan/cloudy-day
- hub/busan/cloudy-night
- hub/busan/rainy-day
- hub/busan/rainy-night
- hub/busan/snowy-day
- hub/busan/snowy-night

### generic/urban (6개)

- generic/urban/clear-day
- generic/urban/clear-night
- generic/urban/cloudy-day
- generic/urban/rainy-day
- generic/urban/rainy-night
- generic/urban/snowy-day

모든 키에 Stitch로 생성된 WebP 에셋이 있다. 에셋은 `public/sketches/<key>.webp` 경로에 위치한다.

## 알려진 제한사항

- **AI 생성 에셋**: Stitch MCP를 통해 AI로 생성된 이미지다. 사람이 제작한 프로덕션 일러스트레이션으로 교체하려면 `public/sketches/`에 새 WebP를 추가하고 베이스라인 매니페스트를 업데이트하면 된다.
- **플레이스홀더 아트 없음**: 모든 키에 실제 생성 에셋이 있다. 미커버 키에 대한 별도의 플레이스홀더는 사용하지 않는다.
- **키 동기화 필수**: 새 키를 추가할 때 `scripts/stitch/sketch-batch.json`의 `keys` 배열과 베이스라인 매니페스트를 반드시 함께 업데이트해야 한다. 드리프트 테스트가 CI에서 이를 검증한다.
- **세션 고정 매니페스트**: 원격 매니페스트 오버라이드는 세션 시작 시 한 번만 로드된다. 세션 중에는 교체되지 않는다.

## 에셋 추가 절차 요약

1. `sketch-batch.json`의 `keys` 배열에 새 키 추가
2. Stitch MCP로 이미지 생성 (`mcp__stitch__generate_screen_from_text`)
3. `process-sketch.ts`로 PNG → WebP 변환 후 `asset-map.json` 업데이트
4. 베이스라인 매니페스트 업데이트
5. `pnpm exec vitest run tests/asset/manifest.test.ts` 통과 확인

자세한 절차는 `docs/skills/asset-manifest-contract.md`를 참조한다.
