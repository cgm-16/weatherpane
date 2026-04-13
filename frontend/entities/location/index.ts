export {
  buildResolvedLocation,
  buildResolvedLocationId,
  buildUnsupportedRouteToken,
  createCatalogLocationResolver,
  isUnsupportedRouteToken,
  recoverUnsupportedRouteContext,
} from './model/location-resolution';
export { buildLocationComparablePath } from './model/location-match';
export { getCatalogEntryById } from './model/search';
export { buildCatalogLocationFromEntry } from './model/catalog';
export type { CatalogEntry, CatalogDepth } from './model/catalog';
export type {
  CatalogLocation,
  RawGpsFallbackLocation,
  RawGpsFallbackReason,
  ResolvedLocation,
  UnsupportedRouteContext,
} from './model/types';
export type {
  CatalogLocationResolutionInput,
  LocationGeocodeCandidate,
  LocationResolutionResult,
  ManualLocationOverride,
} from './model/location-resolution';
