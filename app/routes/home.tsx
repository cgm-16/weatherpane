import { HomePage } from '../../frontend/pages/home/ui/home-page';

export function meta() {
  return [
    { title: 'Weatherpane' },
    {
      name: 'description',
      content: 'Weatherpane app shell placeholder home route.',
    },
  ];
}

export default function Home() {
  return <HomePage />;
}
