import { SettingsPage } from '../../frontend/pages/settings/ui/settings-page';

export function meta() {
  return [
    { title: 'Weatherpane | 설정' },
    {
      name: 'description',
      content: '화면 표시와 접근성 환경을 관리하는 설정 페이지입니다.',
    },
  ];
}

export default function SettingsRoute() {
  return <SettingsPage />;
}
