import { FavoritesPage } from '../../frontend/pages/favorites/ui/favorites-page';

export function meta() {
  return [
    { title: 'Weatherpane | Favorites' },
    { name: 'description', content: 'Favorites placeholder route.' },
  ];
}

export default function FavoritesRoute() {
  return <FavoritesPage />;
}
