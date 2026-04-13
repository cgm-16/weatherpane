// 세션 스케치 매니페스트 타입과 baseline↔override 병합 로직.
import baselineData from '../data/baseline-manifest.json';
import { isSemanticKey, type SemanticKey } from './keys';

export type SketchManifest = Readonly<Record<SemanticKey, string>>;

// 런타임 assert: JSON의 모든 키가 유효한 SemanticKey 여야 한다.
function freezeManifest(raw: Record<string, string>): SketchManifest {
  const entries: Array<[SemanticKey, string]> = [];
  for (const [key, url] of Object.entries(raw)) {
    if (!isSemanticKey(key)) {
      throw new Error(`baseline manifest has invalid semantic key: ${key}`);
    }
    entries.push([key, url]);
  }
  return Object.freeze(Object.fromEntries(entries)) as SketchManifest;
}

export const BASELINE_MANIFEST: SketchManifest = freezeManifest(
  baselineData as Record<string, string>
);

// pending override를 baseline 위에 병합한다. override의 값이 유효한 문자열일 때만 적용.
export function mergeManifest(
  baseline: SketchManifest,
  override: Partial<Record<string, string>> | null | undefined
): SketchManifest {
  if (!override) {
    return baseline;
  }
  const merged: Record<string, string> = { ...baseline };
  for (const [key, url] of Object.entries(override)) {
    if (typeof url === 'string' && url.length > 0 && isSemanticKey(key)) {
      merged[key] = url;
    }
  }
  return Object.freeze(merged) as SketchManifest;
}
