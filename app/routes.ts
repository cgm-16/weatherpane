import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  route('v1/assets/manifest', 'routes/v1.assets.manifest.ts'),
  layout('routes/shell.tsx', [
    index('routes/home.tsx'),
    route('search', 'routes/search.tsx'),
    route('favorites', 'routes/favorites.tsx'),
    route('location/:resolvedLocationId', 'routes/location.tsx'),
  ]),
] satisfies RouteConfig;
