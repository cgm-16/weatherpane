import { SearchPage } from '../../frontend/pages/search/ui/search-page';

export function meta() {
  return [
    { title: 'Weatherpane | Search' },
    { name: 'description', content: 'Search placeholder route.' },
  ];
}

export default function SearchRoute() {
  return <SearchPage />;
}
