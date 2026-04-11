import { SearchPage } from '../../frontend/pages/search/ui/search-page';

export function meta() {
  return [
    { title: 'Weatherpane | 검색' },
    { name: 'description', content: '대한민국 지역을 찾는 검색 페이지입니다.' },
  ];
}

export default function SearchRoute() {
  return <SearchPage />;
}
