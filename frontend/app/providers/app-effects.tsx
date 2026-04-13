import { useOnlineRecovery } from '~/features/app-bootstrap/use-online-recovery';

// 앱 전역 사이드이펙트를 처리합니다. QueryClient와 ActiveLocation 컨텍스트 안에서 마운트됩니다.
export function AppEffects() {
  useOnlineRecovery();
  return null;
}
