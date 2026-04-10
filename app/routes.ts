import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('search', 'routes/search.tsx'),
  route('favorites', 'routes/favorites.tsx'),
  route('location/:resolvedLocationId', 'routes/location.tsx'),
] satisfies RouteConfig;
