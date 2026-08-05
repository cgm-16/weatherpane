import { useSyncExternalStore } from 'react';

// online/offline 이벤트를 window에 등록한다. HTML 표준상 브라우저는
// navigator.onLine 값을 먼저 갱신한 뒤 이벤트를 발생시키므로, getSnapshot이
// 이벤트 시점에 navigator.onLine을 다시 읽어도 항상 최신 값을 얻는다.
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  // navigator.onLine이 boolean이 아니면(Node 24는 navigator는 정의하지만
  // onLine 프로퍼티가 없다) 오프라인이라고 단정할 근거가 없으므로 온라인으로 간주한다.
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
}

function getServerSnapshot(): boolean {
  // 서버 렌더링은 항상 온라인으로 가정한다. 실제 판정은 클라이언트 마운트 이후
  // navigator.onLine과 online/offline 이벤트로 이루어진다.
  return true;
}

// navigator.onLine과 window online/offline 이벤트를 추적합니다.
export function useOnlineStatus(): { isOnline: boolean } {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return { isOnline };
}
