// asset 엔티티 공개 파사드. 시맨틱 키 타입과 선택기를 재내보낸다.
export {
  isSemanticKey,
  parseSemanticKey,
  toSemanticKey,
  type SemanticKey,
  type SemanticKeyParts,
  type SketchFamily,
  type SketchFamilyId,
} from './model/keys';
export { DEFAULT_ARCHETYPE, HUB_BY_ADMIN1 } from './model/archetypes';
export {
  GENERIC_FALLBACK_REWRITES,
  resolveGenericVariant,
  type SketchDaypart,
  type SketchVariantId,
} from './model/variant';
export { selectSketchKey } from './model/selector';
export {
  BASELINE_MANIFEST,
  mergeManifest,
  type SketchManifest,
} from './model/manifest';
export {
  PENDING_MANIFEST_STORAGE_KEY,
  loadSessionManifest,
  type LoadSessionManifestOptions,
  type RemoteManifestFetcher,
} from './api/load-session-manifest';
export {
  REMOTE_MANIFEST_URL,
  fetchRemoteManifest,
} from './api/fetch-remote-manifest';
