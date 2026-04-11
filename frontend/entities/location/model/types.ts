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

const favoriteNicknameMaxLength = 20;
const isoDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isISODateTime(value: unknown): value is ISODateTime {
  if (!isString(value)) {
    return false;
  }

  const match = isoDateTimePattern.exec(value);

  if (!match) {
    return false;
  }

  const [
    ,
    yearString,
    monthString,
    dayString,
    hourString,
    minuteString,
    secondString,
    millisecondString,
    ,
    offsetSign,
    offsetHourString,
    offsetMinuteString,
  ] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const second = Number(secondString);
  const millisecond = Number((millisecondString ?? '').padEnd(3, '0'));
  const offsetHour = Number(offsetHourString ?? '0');
  const offsetMinute = Number(offsetMinuteString ?? '0');

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return false;
  }

  const offsetMinutes =
    offsetSign === '-'
      ? -(offsetHour * 60 + offsetMinute)
      : offsetHour * 60 + offsetMinute;
  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    offsetMinutes * 60_000;
  const localDate = new Date(utcTimestamp + offsetMinutes * 60_000);

  return (
    localDate.getUTCFullYear() === year &&
    localDate.getUTCMonth() === month - 1 &&
    localDate.getUTCDate() === day &&
    localDate.getUTCHours() === hour &&
    localDate.getUTCMinutes() === minute &&
    localDate.getUTCSeconds() === second &&
    localDate.getUTCMilliseconds() === millisecond
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0;
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
    isISODateTime(value.capturedAt)
  );
}

export function isRecentLocation(value: unknown): value is RecentLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isISODateTime(value.lastOpenedAt) &&
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
    (value.nickname === null ||
      (isString(value.nickname) &&
        value.nickname.length <= favoriteNicknameMaxLength)) &&
    isNonNegativeInteger(value.order) &&
    isISODateTime(value.createdAt) &&
    isISODateTime(value.updatedAt)
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

  if (!isISODateTime(value.changedAt) || !isString(value.source)) {
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
    isISODateTime(value.createdAt)
  );
}
