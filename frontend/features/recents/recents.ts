import { createRecentsRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type {
  RawGpsFallbackLocation,
  ResolvedLocation,
} from '~/entities/location/model/types';
import type { StorageLike } from '~/shared/lib/storage/storage-types';

export const MAX_RECENTS = 10;

interface PersistRecentOptions {
  storage?: StorageLike;
}

/**
 * MRU 삽입: 중복 제거 후 앞에 추가, 최대 MAX_RECENTS 개를 유지하고 즉시 저장합니다.
 * React 훅 외부에서 호출할 수 있는 순수 스토리지 함수입니다.
 */
export function persistRecent(
  location: ResolvedLocation | RawGpsFallbackLocation,
  options: PersistRecentOptions = {}
): void {
  try {
    const repo = createRecentsRepository(options);
    const current = repo.getAll();
    const filtered = current.filter(
      (r) => r.location.locationId !== location.locationId
    );
    const next = [
      { location, lastOpenedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    repo.replaceAll(next);
  } catch (error) {
    console.warn('[recents] 최근 지역 저장 실패', error);
  }
}
