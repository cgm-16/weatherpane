import type { Route } from './+types/location';
import { redirect } from 'react-router';

import { LocationPage } from '../../frontend/pages/location/ui/location-page';

// loc_ 접두사가 없는 구형 URL을 정규 형식으로 리다이렉트합니다.
// <Navigate>는 StaticRouter(SSR)에서 동작하지 않으므로 loader에서 처리합니다.
export function loader({ params }: Route.LoaderArgs) {
  const { resolvedLocationId } = params;
  if (
    !resolvedLocationId.startsWith('loc_') &&
    !resolvedLocationId.startsWith('unsupported::')
  ) {
    return redirect(`/location/loc_${resolvedLocationId}`);
  }
  return null;
}

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Weatherpane | ${params.resolvedLocationId}` },
    { name: 'description', content: '날씨 상세 정보 페이지입니다.' },
  ];
}

export default function LocationRoute({ params }: Route.ComponentProps) {
  return <LocationPage resolvedLocationId={params.resolvedLocationId} />;
}
