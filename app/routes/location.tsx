import type { Route } from './+types/location';

import { LocationPage } from '../../frontend/pages/location/ui/location-page';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Weatherpane | ${params.resolvedLocationId}` },
    { name: 'description', content: 'Location placeholder route.' },
  ];
}

export default function LocationRoute({ params }: Route.ComponentProps) {
  return <LocationPage resolvedLocationId={params.resolvedLocationId} />;
}
