import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  route('v1/assets/manifest', 'routes/v1.assets.manifest.ts'),
  route('v1/weather/core', 'routes/v1.weather.core.ts'),
  route('v1/weather/aqi', 'routes/v1.weather.aqi.ts'),
  route('v1/geocode', 'routes/v1.geocode.ts'),
  layout('routes/shell.tsx', [
    index('routes/home.tsx'),
    route('search', 'routes/search.tsx'),
    route('favorites', 'routes/favorites.tsx'),
    route('settings', 'routes/settings.tsx'),
    route('location/:resolvedLocationId', 'routes/location.tsx'),
  ]),
] satisfies RouteConfig;
