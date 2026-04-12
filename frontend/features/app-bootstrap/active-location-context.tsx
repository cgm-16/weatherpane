// ActiveLocation 전역 컨텍스트.
// 앱 초기 렌더링 시 storage에서 동기적으로 읽고, 변경 시 storage에 즉시 반영합니다.
import { createContext, use, useState, type ReactNode } from 'react';
import type { ActiveLocation } from '~/entities/location/model/types';
import { createActiveLocationRepository } from '~/shared/lib/storage/repositories/location-repositories';
import type { StorageLike } from '~/shared/lib/storage/storage-types';

interface ActiveLocationContextValue {
  activeLocation: ActiveLocation | null;
  setActiveLocation: (loc: ActiveLocation) => void;
  clearActiveLocation: () => void;
}

const ActiveLocationContext = createContext<ActiveLocationContextValue | null>(null);

interface ActiveLocationProviderProps {
  children: ReactNode;
  // 테스트에서 격리된 storage를 주입할 수 있습니다. 기본값은 localStorage입니다.
  storage?: StorageLike;
}

export function ActiveLocationProvider({ children, storage }: ActiveLocationProviderProps) {
  const repo = createActiveLocationRepository(storage ? { storage } : {});

  const [activeLocation, setActiveLocationState] = useState<ActiveLocation | null>(
    () => repo.get()
  );

  function setActiveLocation(loc: ActiveLocation) {
    createActiveLocationRepository(storage ? { storage } : {}).set(loc);
    setActiveLocationState(loc);
  }

  function clearActiveLocation() {
    createActiveLocationRepository(storage ? { storage } : {}).clear();
    setActiveLocationState(null);
  }

  return (
    <ActiveLocationContext value={{ activeLocation, setActiveLocation, clearActiveLocation }}>
      {children}
    </ActiveLocationContext>
  );
}

export function useActiveLocation(): ActiveLocationContextValue {
  const ctx = use(ActiveLocationContext);
  if (!ctx) {
    throw new Error('useActiveLocation은 ActiveLocationProvider 안에서 사용해야 합니다');
  }
  return ctx;
}
