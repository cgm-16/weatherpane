// frontend/entities/location/model/catalog.ts

export type CatalogDepth = 1 | 2 | 3 | 4;

export interface CatalogEntry {
  catalogLocationId: string; // 12-char lowercase hex (SHA-256 of NFC canonicalPath)
  canonicalPath: string; // e.g. "서울특별시-종로구-청운동"
  depth: CatalogDepth;
  siDo: string; // first segment (always present)
  siGunGu?: string; // second segment (depth ≥ 2)
  eupMyeonDong?: string; // third segment (depth ≥ 3)
  ri?: string; // fourth segment (depth = 4)
  leafLabel: string; // last segment
  tokens: string[]; // [NFC(canonicalPath), NFC(seg1), NFC(seg2), ...]
  display: {
    primaryLabel: string; // = leafLabel
    secondaryLabel: string | null; // parent path (dash-joined), null at depth 1
  };
  archetypeKey: string | null; // hook for future asset system
  overrideKey: string | null; // hook for manual override table
}

export interface LocationCatalog {
  version: string; // schema version, currently "1"
  generatedAt: string; // ISO 8601 timestamp
  total: number; // entry count
  entries: CatalogEntry[];
}
