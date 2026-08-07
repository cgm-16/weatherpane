// ActiveLocation 전역 컨텍스트.
// 초기값은 SSR과 클라이언트가 일치하도록 null로 고정하고,
// 마운트 후 useEffect에서 storage의 실제 값을 동기화합니다.
// 변경 시 storage에 즉시 반영합니다.
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { ActiveLocation } from '~/entities/location/model/types';
import { createActiveLocationRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type { StorageLike } from '~/shared/lib/storage/storage-types';

interface ActiveLocationContextValue {
  activeLocation: ActiveLocation | null;
  // storage 동기화 useEffect가 한 번 실행되었는지 여부.
  // activeLocation === null은 "위치 없음"과 "아직 동기화 전"을 구분하지 못하므로,
  // 그 둘을 구분해야 하는 소비자(예: 콜드 로드 트리거)를 위해 노출합니다.
  isHydrated: boolean;
  setActiveLocation: (loc: ActiveLocation) => void;
  clearActiveLocation: () => void;
}

const ActiveLocationContext = createContext<ActiveLocationContextValue | null>(
  null
);

interface ActiveLocationProviderProps {
  children: ReactNode;
  // 테스트에서 격리된 storage를 주입할 수 있습니다. 기본값은 localStorage입니다.
  storage?: StorageLike;
}

export function ActiveLocationProvider({
  children,
  storage,
}: ActiveLocationProviderProps) {
  // eslint-disable-next-line @eslint-react/use-state -- 내부 setter는 storage 동기화 래퍼(setActiveLocation)와 명칭 충돌 방지를 위해 별도 명명
  const [activeLocation, setActiveLocationState] =
    useState<ActiveLocation | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const repo = createActiveLocationRepository(storage ? { storage } : {});
    const stored = repo.get();
    // stored가 null이어도 그대로 반영해야 storage가 빈 상태로 바뀌었을 때 이전 값이 남지 않는다.
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- 마운트 시 storage 값을 한 번 동기화하는 것이 의도이므로 setState 호출은 정상이다
    setActiveLocationState(stored);
    // 저장된 값이 없어도 "storage를 한 번 확인했다"는 사실 자체를 알려야 하므로 무조건 호출합니다.
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- 위와 동일한 이유로 마운트 시 1회 호출은 정상이다
    setIsHydrated(true);
  }, [storage]);

  function setActiveLocation(loc: ActiveLocation) {
    createActiveLocationRepository(storage ? { storage } : {}).set(loc);
    setActiveLocationState(loc);
  }

  function clearActiveLocation() {
    createActiveLocationRepository(storage ? { storage } : {}).clear();
    setActiveLocationState(null);
  }

  return (
    <ActiveLocationContext
      value={{
        activeLocation,
        isHydrated,
        setActiveLocation,
        clearActiveLocation,
      }}
    >
      {children}
    </ActiveLocationContext>
  );
}

export function useActiveLocation(): ActiveLocationContextValue {
  const ctx = use(ActiveLocationContext);
  if (!ctx) {
    throw new Error(
      'useActiveLocation은 ActiveLocationProvider 안에서 사용해야 합니다'
    );
  }
  return ctx;
}
