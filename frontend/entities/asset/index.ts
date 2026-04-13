// asset 엔티티 공개 파사드. 시맨틱 키 타입과 선택기를 재내보낸다.
export {
  isSemanticKey,
  parseSemanticKey,
  toSemanticKey,
  type SemanticKey,
} from './model/keys';
export { resolveGenericVariant } from './model/variant';
export { selectSketchKey } from './model/selector';
export {
  BASELINE_MANIFEST,
  mergeManifest,
  type SketchManifest,
} from './model/manifest';
export {
  PENDING_MANIFEST_STORAGE_KEY,
  loadSessionManifest,
} from './api/load-session-manifest';
export {
  SketchManifestProvider,
  useSketchManifest,
} from './ui/sketch-manifest-context';
export {
  SketchBackground,
  type SketchBackgroundProps,
} from './ui/sketch-background';
