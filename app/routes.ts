import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('routes/shell.tsx', [
    index('routes/home.tsx'),
    route('search', 'routes/search.tsx'),
    route('favorites', 'routes/favorites.tsx'),
    route('location/:resolvedLocationId', 'routes/location.tsx'),
  ]),
] satisfies RouteConfig;
