export type ISODateTime = string;

export interface CatalogLocation {
  catalogLocationId: string;
  name: string;
  admin1: string;
  admin2?: string;
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  kind: 'resolved';
  locationId: string;
  catalogLocationId: string;
  name: string;
  admin1: string;
  admin2?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface RawGpsFallbackLocation {
  kind: 'raw-gps';
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  capturedAt: ISODateTime;
}

export type ActiveLocationSource =
  | 'search'
  | 'favorite'
  | 'recent'
  | 'current-location'
  | 'restored';

export type ActiveLocation =
  | {
      kind: 'resolved';
      location: ResolvedLocation;
      source: ActiveLocationSource;
      changedAt: ISODateTime;
    }
  | {
      kind: 'raw-gps';
      location: RawGpsFallbackLocation;
      source: ActiveLocationSource;
      changedAt: ISODateTime;
    };

export interface RecentLocation {
  location: ResolvedLocation | RawGpsFallbackLocation;
  lastOpenedAt: ISODateTime;
}

export interface FavoriteLocation {
  favoriteId: string;
  location: ResolvedLocation;
  nickname: string | null;
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface UnsupportedRouteContext {
  token: string;
  catalogLocation: CatalogLocation;
  createdAt: ISODateTime;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasOptionalString(value: unknown): value is string | undefined {
  return typeof value === 'undefined' || typeof value === 'string';
}

export function isCatalogLocation(value: unknown): value is CatalogLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.catalogLocationId) &&
    isString(value.name) &&
    isString(value.admin1) &&
    hasOptionalString(value.admin2) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude)
  );
}

export function isResolvedLocation(value: unknown): value is ResolvedLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === 'resolved' &&
    isString(value.locationId) &&
    isString(value.catalogLocationId) &&
    isString(value.name) &&
    isString(value.admin1) &&
    hasOptionalString(value.admin2) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    isString(value.timezone)
  );
}

export function isRawGpsFallbackLocation(
  value: unknown
): value is RawGpsFallbackLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.kind === 'raw-gps' &&
    isString(value.locationId) &&
    isString(value.name) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    isString(value.capturedAt)
  );
}

export function isRecentLocation(value: unknown): value is RecentLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.lastOpenedAt) &&
    (isResolvedLocation(value.location) ||
      isRawGpsFallbackLocation(value.location))
  );
}

export function isFavoriteLocation(value: unknown): value is FavoriteLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.favoriteId) &&
    isResolvedLocation(value.location) &&
    (value.nickname === null || isString(value.nickname)) &&
    isNumber(value.order) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

const activeLocationSources = new Set<ActiveLocationSource>([
  'search',
  'favorite',
  'recent',
  'current-location',
  'restored',
]);

export function isActiveLocation(value: unknown): value is ActiveLocation {
  if (!isRecord(value)) {
    return false;
  }

  if (!isString(value.changedAt) || !isString(value.source)) {
    return false;
  }

  if (!activeLocationSources.has(value.source as ActiveLocationSource)) {
    return false;
  }

  if (value.kind === 'resolved') {
    return isResolvedLocation(value.location);
  }

  if (value.kind === 'raw-gps') {
    return isRawGpsFallbackLocation(value.location);
  }

  return false;
}

export function isUnsupportedRouteContext(
  value: unknown
): value is UnsupportedRouteContext {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.token) &&
    isCatalogLocation(value.catalogLocation) &&
    isString(value.createdAt)
  );
}
