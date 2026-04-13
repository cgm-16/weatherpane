import type { Route } from './+types/location';
import { Navigate } from 'react-router';

import { LocationPage } from '../../frontend/pages/location/ui/location-page';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Weatherpane | ${params.resolvedLocationId}` },
    { name: 'description', content: '날씨 상세 정보 페이지입니다.' },
  ];
}

export default function LocationRoute({ params }: Route.ComponentProps) {
  const { resolvedLocationId } = params;
  // loc_ 접두사가 없는 구형 URL을 정규 형식으로 리다이렉트합니다.
  if (
    !resolvedLocationId.startsWith('loc_') &&
    !resolvedLocationId.startsWith('unsupported::')
  ) {
    return <Navigate to={`/location/loc_${resolvedLocationId}`} replace />;
  }
  return <LocationPage resolvedLocationId={resolvedLocationId} />;
}
