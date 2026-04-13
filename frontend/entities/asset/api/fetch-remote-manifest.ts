// 원격 스케치 매니페스트 엔드포인트에 대한 최소 fetch 래퍼.
import type { RemoteManifestFetcher } from './load-session-manifest';

export const REMOTE_MANIFEST_URL = '/v1/assets/manifest';

// 엔드포인트에서 매니페스트 override 객체를 가져온다. 실패 시 throw 한다.
export const fetchRemoteManifest: RemoteManifestFetcher = async () => {
  const response = await fetch(REMOTE_MANIFEST_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`remote manifest fetch failed: ${response.status}`);
  }
  const parsed: unknown = await response.json();
  // 배열이 아닌 일반 객체 형태인지 최소 검증만 수행한다.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('remote manifest fetch failed: invalid shape');
  }
  return parsed as Partial<Record<string, string>>;
};
