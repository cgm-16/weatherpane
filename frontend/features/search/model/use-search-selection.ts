import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import { useWeatherProvider } from '~/shared/api/weather-provider';
import {
  createCatalogLocationResolver,
  getCatalogEntryById,
} from '~/entities/location';
import { createUnsupportedRouteContextRepository } from '~/shared/lib/storage/repositories/unsupported-route-context-repository';
import { createRecentsRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type { SearchCatalogResult } from '~/entities/location/model/search';
import type {
  ActiveLocation,
  CatalogLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';
import type { CatalogEntry } from '~/entities/location/model/catalog';

function buildCatalogLocationFromEntry(entry: CatalogEntry): CatalogLocation {
  return {
    catalogLocationId: entry.catalogLocationId,
    name: entry.leafLabel,
    admin1: entry.siDo,
    ...(entry.siGunGu ? { admin2: entry.siGunGu } : {}),
    // 위도/경도는 해결사가 사용하지 않습니다 — 지오코딩 결과에서 재정의됩니다.
    latitude: 0,
    longitude: 0,
  };
}

function prependRecent(location: ResolvedLocation, now: string) {
  const repo = createRecentsRepository();
  const existing = repo.getAll();
  const filtered = existing.filter(
    (r) =>
      r.location.kind !== 'resolved' ||
      r.location.catalogLocationId !== location.catalogLocationId
  );
  repo.replaceAll([{ location, lastOpenedAt: now }, ...filtered]);
}

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
        prependRecent(resolution.location, now);
        navigate(`/location/${result.catalogLocationId}`);
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
