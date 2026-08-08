import { useEffect } from 'react';
import { useOnlineRecovery } from '~/features/app-bootstrap/use-online-recovery';
import { registerServiceWorker } from '~/shared/pwa/register';

// 앱 전역 사이드이펙트를 처리합니다. QueryClient와 ActiveLocation 컨텍스트 안에서 마운트됩니다.
export function AppEffects() {
  useOnlineRecovery();

  // 프로덕션 빌드에서만 서비스 워커를 등록한다. dev 서버에는 빌드된 sw.js가 없다.
  useEffect(() => {
    registerServiceWorker({
      serviceWorker:
        typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
      enabled: import.meta.env.PROD,
    });
  }, []);

  return null;
}
