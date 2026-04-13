// 스케치 variant(날씨 버킷 + 시간대) 타입과 generic 패밀리의 폴백 재작성 규칙.
import type { WeatherVisualBucket } from '../../weather/model/core-weather';

export type SketchDaypart = 'day' | 'night';
export type SketchVariantId = `${WeatherVisualBucket}-${SketchDaypart}`;

// generic 패밀리는 6-variant만 존재하므로, 누락된 야간 버킷을 시각적으로 가장 가까운 키로 재작성한다.
// 허브 패밀리는 full-8이므로 이 규칙을 적용하지 않는다.
export const GENERIC_FALLBACK_REWRITES: Readonly<
  Partial<Record<SketchVariantId, SketchVariantId>>
> = {
  'cloudy-night': 'clear-night',
  'snowy-night': 'rainy-night',
};

export function resolveGenericVariant(
  variant: SketchVariantId
): SketchVariantId {
  return GENERIC_FALLBACK_REWRITES[variant] ?? variant;
}
