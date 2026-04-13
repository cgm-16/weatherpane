// 스케치 에셋 시맨틱 키(`<family>/<familyId>/<variant>`) 타입과 유틸리티.

export type SketchFamily = 'hub' | 'generic';
export type SketchFamilyId = string;
export type SketchVariantId = string;
export type SemanticKey =
  `${SketchFamily}/${SketchFamilyId}/${SketchVariantId}`;

export interface SemanticKeyParts {
  family: SketchFamily;
  familyId: SketchFamilyId;
  variant: SketchVariantId;
}

const SKETCH_FAMILIES: readonly SketchFamily[] = ['hub', 'generic'];
// 소문자 영문/숫자와 대시만 허용하여 예기치 않은 문자열이 키로 들어오는 것을 막는다.
const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function isSketchFamily(value: string): value is SketchFamily {
  return (SKETCH_FAMILIES as readonly string[]).includes(value);
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

  if (!SEGMENT_PATTERN.test(familyId) || !SEGMENT_PATTERN.test(variant)) {
    return null;
  }

  return { family, familyId, variant };
}

export function isSemanticKey(value: unknown): value is SemanticKey {
  return typeof value === 'string' && parseSemanticKey(value) !== null;
}
