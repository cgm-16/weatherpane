import lookupData from '../catalog.lookup.generated.json';

import {
  assertGeneratedCatalogLookup,
  buildCatalogEntryFromParts,
  GENERATED_CATALOG_LOCATION_ID_LENGTH,
  type GeneratedCatalogLookup,
} from './catalog-artifacts';
import type { CatalogEntry, LocationCatalog } from './catalog';

const defaultLookup = lookupData as unknown as GeneratedCatalogLookup;

assertGeneratedCatalogLookup(defaultLookup);

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

  if (catalogLocationId.length !== GENERATED_CATALOG_LOCATION_ID_LENGTH) {
    return null;
  }

  let idStart = defaultLookup.ids.indexOf(catalogLocationId);

  while (
    idStart !== -1 &&
    idStart % GENERATED_CATALOG_LOCATION_ID_LENGTH !== 0
  ) {
    idStart = defaultLookup.ids.indexOf(catalogLocationId, idStart + 1);
  }

  if (idStart === -1) {
    return null;
  }

  const entryIndex = idStart / GENERATED_CATALOG_LOCATION_ID_LENGTH;
  const [canonicalPath, archetypeKey, overrideKey] =
    defaultLookup.entries[entryIndex];

  return buildCatalogEntryFromParts(
    catalogLocationId,
    canonicalPath,
    archetypeKey,
    overrideKey
  );
}
