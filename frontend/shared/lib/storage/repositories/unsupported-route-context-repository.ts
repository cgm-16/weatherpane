import { isUnsupportedRouteContext } from '../../../../entities/location/model/types';
import { getSessionStorage } from '../browser-storage';
import { storageKeys, storageSchemaVersion } from '../storage-keys';
import type { StorageLike } from '../storage-types';
import { createVersionedRecordRepository } from './repository-utils';

interface UnsupportedRouteContextRepositoryOptions {
  storage?: StorageLike;
}

export function createUnsupportedRouteContextRepository({
  storage,
}: UnsupportedRouteContextRepositoryOptions = {}) {
  const repository = createVersionedRecordRepository({
    getDefaultStorage: getSessionStorage,
    key: storageKeys.unsupportedRouteContext,
    storage,
    validateValue: isUnsupportedRouteContext,
    version: storageSchemaVersion,
  });

  return {
    clear: repository.clear,
    get: repository.get,
    remove: repository.remove,
    set(context: Parameters<typeof repository.set>[1]) {
      repository.set(context.token, context);
    },
  };
}
