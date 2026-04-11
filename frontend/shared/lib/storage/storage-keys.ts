export const storageSchemaVersion = 1;

export const storageKeys = {
  activeLocation: `weatherpane.active-location.v${storageSchemaVersion}`,
  aqiSnapshots: `weatherpane.aqi-snapshots.v${storageSchemaVersion}`,
  favorites: `weatherpane.favorites.v${storageSchemaVersion}`,
  recents: `weatherpane.recents.v${storageSchemaVersion}`,
  theme: `weatherpane.theme.v${storageSchemaVersion}`,
  unsupportedRouteContext: `weatherpane.unsupported-route-context.v${storageSchemaVersion}`,
  weatherSnapshots: `weatherpane.weather-snapshots.v${storageSchemaVersion}`,
} as const;
