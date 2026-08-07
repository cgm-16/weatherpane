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

  useEffect(() => {
    const repo = createActiveLocationRepository(storage ? { storage } : {});
    const stored = repo.get();
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- 마운트 시 storage 값을 한 번 동기화하는 것이 의도이므로 setState 호출은 정상이다
    if (stored) setActiveLocationState(stored);
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
      value={{ activeLocation, setActiveLocation, clearActiveLocation }}
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
