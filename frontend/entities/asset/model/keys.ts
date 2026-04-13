// 스케치 에셋 시맨틱 키(`<family>/<familyId>/<variant>`) 타입과 유틸리티.
import type { SketchVariantId } from './variant';

export type SketchFamily = 'hub' | 'generic';
export type SketchFamilyId = 'seoul' | 'busan' | 'urban';
export type SemanticKey =
  `${SketchFamily}/${SketchFamilyId}/${SketchVariantId}`;

export interface SemanticKeyParts {
  family: SketchFamily;
  familyId: SketchFamilyId;
  variant: SketchVariantId;
}

const SKETCH_FAMILIES: readonly SketchFamily[] = ['hub', 'generic'];
const SKETCH_FAMILY_IDS: readonly SketchFamilyId[] = [
  'seoul',
  'busan',
  'urban',
];
// 허용된 variant 리터럴 집합. WeatherVisualBucket × SketchDaypart 조합.
const SKETCH_VARIANT_IDS: readonly SketchVariantId[] = [
  'clear-day',
  'clear-night',
  'cloudy-day',
  'cloudy-night',
  'rainy-day',
  'rainy-night',
  'snowy-day',
  'snowy-night',
];

function isSketchFamily(value: string): value is SketchFamily {
  return (SKETCH_FAMILIES as readonly string[]).includes(value);
}

function isSketchFamilyId(value: string): value is SketchFamilyId {
  return (SKETCH_FAMILY_IDS as readonly string[]).includes(value);
}

function isSketchVariantId(value: string): value is SketchVariantId {
  return (SKETCH_VARIANT_IDS as readonly string[]).includes(value);
}

export function toSemanticKey(parts: SemanticKeyParts): SemanticKey {
  return `${parts.family}/${parts.familyId}/${parts.variant}`;
}

export function parseSemanticKey(value: string): SemanticKeyParts | null {
  const segments = value.split('/');

  if (segments.length !== 3) {
    return null;
  }

  const [family, familyId, variant] = segments;

  if (!isSketchFamily(family)) {
    return null;
  }

  if (!isSketchFamilyId(familyId) || !isSketchVariantId(variant)) {
    return null;
  }

  return { family, familyId, variant };
}

export function isSemanticKey(value: unknown): value is SemanticKey {
  return typeof value === 'string' && parseSemanticKey(value) !== null;
}
