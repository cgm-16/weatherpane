// tests/catalog-generation.test.ts
import { describe, expect, it } from 'vitest';
import {
  parseCatalogEntry,
  computeCatalogLocationId,
  computeTokens,
  validatePopularLocations,
} from '../scripts/catalog-parser';
import { POPULAR_LOCATIONS } from '../frontend/entities/location/data/popular-locations';

// ─── computeCatalogLocationId ─────────────────────────────────────────────

describe('computeCatalogLocationId', () => {
  it('returns a 12-char lowercase hex string', () => {
    expect(computeCatalogLocationId('서울특별시')).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic: same input always gives same ID', () => {
    const path = '서울특별시-종로구-청운동';
    expect(computeCatalogLocationId(path)).toBe(computeCatalogLocationId(path));
  });

  it('produces known IDs for each depth level', () => {
    expect(computeCatalogLocationId('서울특별시')).toBe('af6564d37582');
    expect(computeCatalogLocationId('서울특별시-종로구')).toBe('e50058fbd673');
    expect(computeCatalogLocationId('서울특별시-종로구-청운동')).toBe(
      '5f5def784f91'
    );
    expect(
      computeCatalogLocationId('전북특별자치도-부안군-위도면-상왕등리')
    ).toBe('8e3a1bacdc51');
  });

  it('produces distinct IDs for distinct paths', () => {
    const ids = [
      computeCatalogLocationId('서울특별시'),
      computeCatalogLocationId('서울특별시-종로구'),
      computeCatalogLocationId('서울특별시-종로구-청운동'),
      computeCatalogLocationId('전북특별자치도-부안군-위도면-상왕등리'),
    ];
    expect(new Set(ids).size).toBe(4);
  });

  it('NFC-normalizes before hashing: NFD and NFC inputs give same ID', () => {
    const nfc = '서울특별시';
    const nfd = nfc.normalize('NFD');
    expect(computeCatalogLocationId(nfc)).toBe(computeCatalogLocationId(nfd));
  });

  it('is deterministic over 100 repeated calls', () => {
    const path = '부산광역시-해운대구';
    const ids = Array.from({ length: 100 }, () =>
      computeCatalogLocationId(path)
    );
    expect(new Set(ids).size).toBe(1);
  });
});

// ─── computeTokens ────────────────────────────────────────────────────────

describe('computeTokens', () => {
  it('depth-1: returns [path, seg1]', () => {
    expect(computeTokens('서울특별시')).toEqual(['서울특별시', '서울특별시']);
  });

  it('depth-2: returns [path, seg1, seg2]', () => {
    expect(computeTokens('서울특별시-종로구')).toEqual([
      '서울특별시-종로구',
      '서울특별시',
      '종로구',
    ]);
  });

  it('depth-3: returns [path, seg1, seg2, seg3]', () => {
    expect(computeTokens('서울특별시-종로구-청운동')).toEqual([
      '서울특별시-종로구-청운동',
      '서울특별시',
      '종로구',
      '청운동',
    ]);
  });

  it('depth-4: returns [path, seg1, seg2, seg3, seg4]', () => {
    expect(computeTokens('전북특별자치도-부안군-위도면-상왕등리')).toEqual([
      '전북특별자치도-부안군-위도면-상왕등리',
      '전북특별자치도',
      '부안군',
      '위도면',
      '상왕등리',
    ]);
  });

  it('all tokens are NFC-normalized', () => {
    const tokens = computeTokens('서울특별시'.normalize('NFD'));
    for (const token of tokens) {
      expect(token).toBe(token.normalize('NFC'));
    }
  });
});

// ─── parseCatalogEntry — depth 1 ─────────────────────────────────────────

describe('parseCatalogEntry depth-1', () => {
  const entry = parseCatalogEntry('서울특별시');

  it('sets catalogLocationId', () => {
    expect(entry.catalogLocationId).toBe('af6564d37582');
  });
  it('sets canonicalPath', () => {
    expect(entry.canonicalPath).toBe('서울특별시');
  });
  it('sets depth to 1', () => {
    expect(entry.depth).toBe(1);
  });
  it('sets siDo', () => {
    expect(entry.siDo).toBe('서울특별시');
  });
  it('siGunGu is undefined', () => {
    expect(entry.siGunGu).toBeUndefined();
  });
  it('eupMyeonDong is undefined', () => {
    expect(entry.eupMyeonDong).toBeUndefined();
  });
  it('ri is undefined', () => {
    expect(entry.ri).toBeUndefined();
  });
  it('sets leafLabel to siDo', () => {
    expect(entry.leafLabel).toBe('서울특별시');
  });
  it('sets display.primaryLabel', () => {
    expect(entry.display.primaryLabel).toBe('서울특별시');
  });
  it('sets display.secondaryLabel to null at depth 1', () => {
    expect(entry.display.secondaryLabel).toBeNull();
  });
  it('archetypeKey is null', () => {
    expect(entry.archetypeKey).toBeNull();
  });
  it('overrideKey is null', () => {
    expect(entry.overrideKey).toBeNull();
  });
  it('stores NFC-normalized canonicalPath when given NFD input', () => {
    const nfd = '서울특별시'.normalize('NFD');
    const nfdEntry = parseCatalogEntry(nfd);
    expect(nfdEntry.canonicalPath).toBe('서울특별시'.normalize('NFC'));
  });
});

// ─── parseCatalogEntry — depth 2 ─────────────────────────────────────────

describe('parseCatalogEntry depth-2', () => {
  const entry = parseCatalogEntry('서울특별시-종로구');

  it('sets depth to 2', () => {
    expect(entry.depth).toBe(2);
  });
  it('sets catalogLocationId', () => {
    expect(entry.catalogLocationId).toBe('e50058fbd673');
  });
  it('sets siDo', () => {
    expect(entry.siDo).toBe('서울특별시');
  });
  it('sets siGunGu', () => {
    expect(entry.siGunGu).toBe('종로구');
  });
  it('eupMyeonDong is undefined', () => {
    expect(entry.eupMyeonDong).toBeUndefined();
  });
  it('sets leafLabel to siGunGu', () => {
    expect(entry.leafLabel).toBe('종로구');
  });
  it('sets display.secondaryLabel to parent path', () => {
    expect(entry.display.secondaryLabel).toBe('서울특별시');
  });
});

// ─── parseCatalogEntry — depth 3 ─────────────────────────────────────────

describe('parseCatalogEntry depth-3', () => {
  const entry = parseCatalogEntry('서울특별시-종로구-청운동');

  it('sets depth to 3', () => {
    expect(entry.depth).toBe(3);
  });
  it('sets catalogLocationId', () => {
    expect(entry.catalogLocationId).toBe('5f5def784f91');
  });
  it('sets eupMyeonDong', () => {
    expect(entry.eupMyeonDong).toBe('청운동');
  });
  it('ri is undefined', () => {
    expect(entry.ri).toBeUndefined();
  });
  it('sets leafLabel to eupMyeonDong', () => {
    expect(entry.leafLabel).toBe('청운동');
  });
  it('sets display.secondaryLabel to parent path (dash-joined)', () => {
    expect(entry.display.secondaryLabel).toBe('서울특별시-종로구');
  });
});

// ─── parseCatalogEntry — depth 4 ─────────────────────────────────────────

describe('parseCatalogEntry depth-4', () => {
  const entry = parseCatalogEntry('전북특별자치도-부안군-위도면-상왕등리');

  it('sets depth to 4', () => {
    expect(entry.depth).toBe(4);
  });
  it('sets catalogLocationId', () => {
    expect(entry.catalogLocationId).toBe('8e3a1bacdc51');
  });
  it('sets eupMyeonDong', () => {
    expect(entry.eupMyeonDong).toBe('위도면');
  });
  it('sets ri', () => {
    expect(entry.ri).toBe('상왕등리');
  });
  it('sets leafLabel to ri', () => {
    expect(entry.leafLabel).toBe('상왕등리');
  });
  it('sets display.secondaryLabel to parent path (dash-joined)', () => {
    expect(entry.display.secondaryLabel).toBe('전북특별자치도-부안군-위도면');
  });
});

// ─── parseCatalogEntry — malformed input ─────────────────────────────────

describe('parseCatalogEntry malformed input', () => {
  it('throws on empty string', () => {
    expect(() => parseCatalogEntry('')).toThrow();
  });
  it('throws on depth > 4 (five segments)', () => {
    expect(() => parseCatalogEntry('a-b-c-d-e')).toThrow();
  });
  it('throws when any segment is empty (leading dash)', () => {
    expect(() => parseCatalogEntry('-서울특별시')).toThrow();
  });
  it('throws when any segment is empty (trailing dash)', () => {
    expect(() => parseCatalogEntry('서울특별시-')).toThrow();
  });
  it('throws when any segment is empty (double dash)', () => {
    expect(() => parseCatalogEntry('서울특별시--종로구')).toThrow();
  });
  it('throws on only-dashes string', () => {
    expect(() => parseCatalogEntry('---')).toThrow();
  });
});

// ─── validatePopularLocations ─────────────────────────────────────────────

describe('validatePopularLocations', () => {
  const builtEntries = POPULAR_LOCATIONS.map((p) => parseCatalogEntry(p));

  it('returns no invalid entries when all popular paths exist', () => {
    const result = validatePopularLocations(builtEntries, POPULAR_LOCATIONS);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toEqual(POPULAR_LOCATIONS);
  });

  it('returns invalid entries for missing paths', () => {
    const fakePopular = ['서울특별시', '존재하지않는도시'];
    const result = validatePopularLocations(builtEntries, fakePopular);
    expect(result.invalid).toContain('존재하지않는도시');
    expect(result.valid).toContain('서울특별시');
  });

  it('handles empty inputs', () => {
    const result = validatePopularLocations([], []);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(0);
  });
});
