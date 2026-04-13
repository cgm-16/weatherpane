// 위치와 날씨 조건으로부터 스케치 에셋 시맨틱 키를 결정하는 선택기.
import type {
  RawGpsFallbackLocation,
  ResolvedLocation,
} from '../../location/model/types';
import type { WeatherCondition } from '../../weather/model/core-weather';

import { DEFAULT_ARCHETYPE, HUB_BY_ADMIN1 } from './archetypes';
import { toSemanticKey, type SemanticKey } from './keys';
import { resolveGenericVariant, type SketchVariantId } from './variant';

export function selectSketchKey(
  location: ResolvedLocation | RawGpsFallbackLocation,
  condition: WeatherCondition
): SemanticKey {
  const variant: SketchVariantId = `${condition.visualBucket}-${
    condition.isDay ? 'day' : 'night'
  }`;

  // resolved 위치이고 admin1이 허브에 매핑되어 있으면 허브 패밀리를 그대로 사용한다 (재작성 없음).
  if (location.kind === 'resolved') {
    const hub = HUB_BY_ADMIN1[location.admin1];
    if (hub) {
      return toSemanticKey({ family: 'hub', familyId: hub, variant });
    }
  }

  // 그 외 (허브 미적용 resolved, raw-gps)는 기본 archetype의 generic 패밀리로 폴백한다.
  return toSemanticKey({
    family: 'generic',
    familyId: DEFAULT_ARCHETYPE,
    variant: resolveGenericVariant(variant),
  });
}
