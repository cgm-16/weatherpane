import { useState, useSyncExternalStore } from 'react';

// online/offline 이벤트와 마운트 시점 navigator.onLine을 기반으로 접속 상태를 추적하는
// 훅 인스턴스별 외부 스토어. 이벤트가 발생하기 전까지는 스냅샷을 지연 계산하고,
// 이후에는 이벤트가 알려준 값을 그대로 캐시해 반환한다.
function createOnlineStatusStore() {
  let cachedIsOnline: boolean | null = null;

  function subscribe(callback: () => void) {
    function handleOnline() {
      cachedIsOnline = true;
      callback();
    }
    function handleOffline() {
      cachedIsOnline = false;
      callback();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  function getSnapshot(): boolean {
    if (cachedIsOnline === null) {
      // navigator.onLine이 boolean이 아니면(Node 24는 navigator는 정의하지만
      // onLine 프로퍼티가 없다) 오프라인이라고 단정할 근거가 없으므로 온라인으로 간주한다.
      cachedIsOnline =
        typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
    }
    return cachedIsOnline;
  }

  function getServerSnapshot(): boolean {
    // 서버 렌더링은 항상 온라인으로 가정한다. 실제 판정은 클라이언트 마운트 이후
    // navigator.onLine과 online/offline 이벤트로 이루어진다.
    return true;
  }

  return { subscribe, getSnapshot, getServerSnapshot };
}

// navigator.onLine과 window online/offline 이벤트를 추적합니다.
export function useOnlineStatus(): { isOnline: boolean } {
  // 스토어를 훅 인스턴스마다 한 번만 생성한다. useState의 지연 초기화 함수는
  // 서버 렌더링 시에도 실행되지만, 이 안에서는 navigator를 건드리지 않는다.
  const [store] = useState(createOnlineStatusStore);
  const isOnline = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  return { isOnline };
}
