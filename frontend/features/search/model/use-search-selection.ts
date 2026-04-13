import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import { useWeatherProvider } from '~/shared/api/weather-provider';
import {
  buildCatalogLocationFromEntry,
  createCatalogLocationResolver,
  getCatalogEntryById,
} from '~/entities/location';
import { createUnsupportedRouteContextRepository } from '~/shared/lib/storage/repositories/unsupported-route-context-repository';
import { persistRecent } from '~/features/recents';
import type { SearchCatalogResult } from '~/entities/location/model/search';
import type { ActiveLocation } from '~/entities/location/model/types';

export function useSearchSelection() {
  const navigate = useNavigate();
  const { setActiveLocation } = useActiveLocation();
  const { geocode } = useWeatherProvider();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<Error | null>(null);
  const [pendingRetryResult, setPendingRetryResult] =
    useState<SearchCatalogResult | null>(null);

  async function selectResult(result: SearchCatalogResult) {
    if (resolvingId !== null) return;
    setResolvingId(result.catalogLocationId);
    setSelectionError(null);

    try {
      const entry = getCatalogEntryById(result.catalogLocationId);
      const now = new Date().toISOString();

      const resolver = createCatalogLocationResolver({
        geocode,
        now: () => now,
        unsupportedRouteContextRepository:
          createUnsupportedRouteContextRepository(),
      });

      const resolution = await resolver.resolveCatalogLocation({
        catalogLocation: entry
          ? buildCatalogLocationFromEntry(entry)
          : {
              catalogLocationId: result.catalogLocationId,
              name: result.primaryLabel,
              admin1:
                result.secondaryPath?.split('-')[0] ?? result.primaryLabel,
              latitude: 0,
              longitude: 0,
            },
        canonicalPath: result.canonicalPath,
        overrideKey: entry?.overrideKey,
      });

      if (resolution.kind === 'resolved') {
        const activeLocation: ActiveLocation = {
          kind: 'resolved',
          location: resolution.location,
          source: 'search',
          changedAt: now,
        };
        setActiveLocation(activeLocation);
        persistRecent(resolution.location);
        navigate(`/location/${resolution.location.locationId}`);
      } else {
        navigate(`/location/${resolution.token}`);
      }
    } catch (err) {
      console.error('[use-search-selection] resolveCatalogLocation 실패', err);
      setSelectionError(
        err instanceof Error
          ? err
          : new Error('위치를 불러오는 데 실패했습니다.')
      );
      setPendingRetryResult(result);
    } finally {
      setResolvingId(null);
    }
  }

  function retrySelection() {
    if (pendingRetryResult === null) return;
    void selectResult(pendingRetryResult);
  }

  return { selectResult, resolvingId, selectionError, retrySelection };
}
