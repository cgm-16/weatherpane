import {
  isActiveLocation,
  isFavoriteLocation,
  isRecentLocation,
} from '../../../../entities/location/model/types';
import { getLocalStorage } from '../browser-storage';
import { storageKeys, storageSchemaVersion } from '../storage-keys';
import type { StorageLike } from '../storage-types';
import {
  createVersionedCollectionRepository,
  createVersionedValueRepository,
} from './repository-utils';

interface RepositoryOptions {
  storage?: StorageLike;
}

export function createFavoritesRepository({ storage }: RepositoryOptions = {}) {
  return createVersionedCollectionRepository({
    getDefaultStorage: getLocalStorage,
    key: storageKeys.favorites,
    storage,
    validateItem: isFavoriteLocation,
    version: storageSchemaVersion,
  });
}

export function createRecentsRepository({ storage }: RepositoryOptions = {}) {
  return createVersionedCollectionRepository({
    getDefaultStorage: getLocalStorage,
    key: storageKeys.recents,
    storage,
    validateItem: isRecentLocation,
    version: storageSchemaVersion,
  });
}

export function createActiveLocationRepository({
  storage,
}: RepositoryOptions = {}) {
  return createVersionedValueRepository({
    getDefaultStorage: getLocalStorage,
    getFallback: () => null,
    key: storageKeys.activeLocation,
    storage,
    validate: isActiveLocation,
    version: storageSchemaVersion,
  });
}
