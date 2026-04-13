// 세션 스케치 매니페스트 로더: pending override를 baseline에 병합하고
// 백그라운드에서 원격 매니페스트를 가져와 다음 세션용으로 저장한다.
import { getLocalStorage } from '~/shared/lib/storage/browser-storage';
import {
  BASELINE_MANIFEST,
  mergeManifest,
  type SketchManifest,
} from '../model/manifest';
import { fetchRemoteManifest } from './fetch-remote-manifest';

export const PENDING_MANIFEST_STORAGE_KEY = 'sketch-manifest-pending';

export type RemoteManifestFetcher = () => Promise<
  Partial<Record<string, string>>
>;

export interface LoadSessionManifestOptions {
  remoteFetcher?: RemoteManifestFetcher;
}

export function loadSessionManifest(
  options?: LoadSessionManifestOptions
): SketchManifest {
  const storage = getLocalStorage();
  // SSR 등 스토리지가 없으면 baseline 그대로 반환한다.
  if (!storage) {
    return BASELINE_MANIFEST;
  }

  let manifest: SketchManifest = BASELINE_MANIFEST;
  const pendingRaw = storage.getItem(PENDING_MANIFEST_STORAGE_KEY);
  if (pendingRaw !== null) {
    try {
      const parsed = JSON.parse(pendingRaw) as Partial<Record<string, string>>;
      manifest = mergeManifest(BASELINE_MANIFEST, parsed);
    } catch {
      // 손상된 로컬 데이터는 제거하고 baseline으로 폴백한다.
      storage.removeItem(PENDING_MANIFEST_STORAGE_KEY);
      manifest = BASELINE_MANIFEST;
    }
  }

  // 백그라운드로 원격 매니페스트를 가져온다. 반환값/예외는 현재 세션에 영향을 주지 않는다.
  const remoteFetcher = options?.remoteFetcher ?? fetchRemoteManifest;
  try {
    const pending = remoteFetcher();
    void Promise.resolve(pending)
      .then((value) => {
        if (value !== null && typeof value === 'object') {
          try {
            storage.setItem(
              PENDING_MANIFEST_STORAGE_KEY,
              JSON.stringify(value)
            );
          } catch {
            // 스토리지 쓰기 실패는 조용히 무시한다.
          }
        }
      })
      .catch(() => {
        // 실패 시 기존 pending 값을 건드리지 않는다.
      });
  } catch {
    // remoteFetcher가 동기적으로 throw 하더라도 무시한다.
  }

  return manifest;
}
