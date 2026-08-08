// 서비스 워커 등록. 프로덕션 빌드에서만, 브라우저가 지원할 때만 등록한다.
// 개발 서버에는 빌드된 sw.js가 없고, 개발 중 서비스 워커 캐시는 오히려 방해가 되므로
// 제외한다. 등록 실패는 앱 동작을 막지 않는다 — 서비스 워커는 향상일 뿐이다.
export interface RegisterServiceWorkerOptions {
  serviceWorker: ServiceWorkerContainer | undefined;
  enabled: boolean;
  scriptUrl?: string;
}

export function registerServiceWorker({
  serviceWorker,
  enabled,
  scriptUrl = '/sw.js',
}: RegisterServiceWorkerOptions): void {
  if (!enabled || !serviceWorker) return;
  void serviceWorker.register(scriptUrl).catch(() => {
    // 조용히 무시: 등록 실패 시 앱은 네트워크 직접 fetch로 정상 동작한다.
  });
}
