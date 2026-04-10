import { PlaceholderPage } from '../../../shared/ui/placeholder-page';

type LocationPageProps = {
  resolvedLocationId: string;
};

export function LocationPage({ resolvedLocationId }: LocationPageProps) {
  return (
    <PlaceholderPage
      description="Placeholder route for a resolved location detail screen."
      title="Location placeholder"
    >
      <p className="mt-4 text-sm text-slate-300">
        resolvedLocationId:{' '}
        <span className="font-medium text-sky-200">{resolvedLocationId}</span>
      </p>
    </PlaceholderPage>
  );
}
