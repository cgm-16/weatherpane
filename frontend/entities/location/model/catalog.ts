// frontend/entities/location/model/catalog.ts

export type CatalogDepth = 1 | 2 | 3 | 4;

export interface CatalogEntry {
  catalogLocationId: string; // 12자리 소문자 16진수 (NFC canonicalPath의 SHA-256)
  canonicalPath: string; // 예: "서울특별시-종로구-청운동"
  depth: CatalogDepth;
  siDo: string; // 첫 번째 세그먼트 (항상 존재)
  siGunGu?: string; // 두 번째 세그먼트 (depth ≥ 2)
  eupMyeonDong?: string; // 세 번째 세그먼트 (depth ≥ 3)
  ri?: string; // 네 번째 세그먼트 (depth = 4)
  leafLabel: string; // 마지막 세그먼트
  tokens: string[]; // [NFC(canonicalPath), NFC(세그먼트1), NFC(세그먼트2), ...]
  display: {
    primaryLabel: string; // = leafLabel
    secondaryLabel: string | null; // 상위 경로 (대시 구분), depth 1이면 null
  };
  archetypeKey: string | null; // 에셋 시스템 연동을 위한 확장 포인트
  overrideKey: string | null; // 수동 오버라이드 테이블을 위한 확장 포인트
}

export interface LocationCatalog {
  version: string; // 스키마 버전, 현재 "1"
  generatedAt: string; // ISO 8601 형식 생성 일시
  total: number; // 항목 수
  entries: CatalogEntry[];
}
