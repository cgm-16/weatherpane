import lookupData from '../catalog.lookup.generated.json';

import {
  buildCatalogEntryFromParts,
  type GeneratedCatalogLookup,
} from './catalog-artifacts';
import type { CatalogEntry, LocationCatalog } from './catalog';

const catalogLocationIdLength = 12;
const defaultLookup = lookupData as unknown as GeneratedCatalogLookup;

if (
  defaultLookup.ids.length !==
  defaultLookup.total * catalogLocationIdLength
) {
  throw new Error('catalog-lookup: fixed-width ID artifact length is invalid');
}

export function getCatalogEntryById(
  catalogLocationId: string,
  catalog?: LocationCatalog
): CatalogEntry | null {
  if (catalog) {
    return (
      catalog.entries.find(
        (entry) => entry.catalogLocationId === catalogLocationId
      ) ?? null
    );
  }

  for (let index = 0; index < defaultLookup.total; index += 1) {
    const idStart = index * catalogLocationIdLength;

    if (
      defaultLookup.ids.slice(idStart, idStart + catalogLocationIdLength) !==
      catalogLocationId
    ) {
      continue;
    }

    const [canonicalPath, archetypeKey, overrideKey] =
      defaultLookup.entries[index];

    return buildCatalogEntryFromParts(
      catalogLocationId,
      canonicalPath,
      archetypeKey,
      overrideKey
    );
  }

  return null;
}
