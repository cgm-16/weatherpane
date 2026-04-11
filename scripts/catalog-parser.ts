// scripts/catalog-parser.ts
import { createHash } from 'node:crypto';
import type {
  CatalogEntry,
  CatalogDepth,
} from '../frontend/entities/location/model/catalog';

/**
 * NFC 정규화된 카노니컬 경로의 SHA-256 해시에서 앞 12개 16진수 문자를 반환한다.
 * 결정적(deterministic)이며, 현재 데이터셋 20,556개 항목에서 충돌 미발견.
 */
export function computeCatalogLocationId(canonicalPath: string): string {
  const normalized = canonicalPath.normalize('NFC');
  return createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex')
    .slice(0, 12);
}

/**
 * NFC 정규화된 검색 토큰 배열 [전체경로, 세그먼트1, 세그먼트2, ...]을 반환한다.
 * 검색 레이어의 즉시 매칭에 사용된다.
 */
export function computeTokens(canonicalPath: string): string[] {
  const nfcPath = canonicalPath.normalize('NFC');
  const segments = canonicalPath.split('-').map((s) => s.normalize('NFC'));
  return [nfcPath, ...segments];
}

/**
 * 원시 행정구역 문자열 하나를 CatalogEntry로 파싱한다.
 * 빈 문자열, 빈 세그먼트, 또는 depth가 [1, 4] 범위를 벗어나면 예외를 던진다.
 */
export function parseCatalogEntry(rawPath: string): CatalogEntry {
  if (!rawPath) {
    throw new Error(`parseCatalogEntry: empty canonicalPath`);
  }

  const canonicalPath = rawPath.normalize('NFC');
  const segments = canonicalPath.split('-');

  if (segments.length > 4) {
    throw new Error(
      `parseCatalogEntry: depth ${segments.length} out of range [1,4] for "${canonicalPath}"`
    );
  }

  for (const seg of segments) {
    if (!seg) {
      throw new Error(`parseCatalogEntry: empty segment in "${canonicalPath}"`);
    }
  }

  const depth = segments.length as CatalogDepth;
  const [siDo, siGunGu, eupMyeonDong, ri] = segments;
  const leafLabel = segments[segments.length - 1];
  const secondaryLabel =
    depth === 1 ? null : segments.slice(0, segments.length - 1).join('-');

  return {
    catalogLocationId: computeCatalogLocationId(canonicalPath),
    canonicalPath,
    depth,
    siDo,
    ...(siGunGu !== undefined && { siGunGu }),
    ...(eupMyeonDong !== undefined && { eupMyeonDong }),
    ...(ri !== undefined && { ri }),
    leafLabel,
    tokens: computeTokens(canonicalPath),
    display: {
      primaryLabel: leafLabel,
      secondaryLabel,
    },
    archetypeKey: null,
    overrideKey: null,
  };
}

export interface PopularValidationResult {
  valid: string[];
  invalid: string[];
}

/**
 * popularPaths의 모든 경로를 entries의 카노니컬 경로 목록과 대조 검증한다.
 * { valid, invalid } 배열을 반환하며, 예외 처리는 호출자가 결정한다.
 */
export function validatePopularLocations(
  entries: CatalogEntry[],
  popularPaths: string[]
): PopularValidationResult {
  const canonicalSet = new Set(entries.map((e) => e.canonicalPath));
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const path of popularPaths) {
    if (canonicalSet.has(path)) {
      valid.push(path);
    } else {
      invalid.push(path);
    }
  }

  return { valid, invalid };
}
