// 세션 스케치 매니페스트를 React 트리에 공급하는 컨텍스트.
import { createContext, use, type ReactNode } from 'react';

import type { SketchManifest } from '../model/manifest';

// null 센트리넬로 미공급 상태와 유효 매니페스트를 구분한다.
const SketchManifestContext = createContext<SketchManifest | null>(null);

export interface SketchManifestProviderProps {
  manifest: SketchManifest;
  children: ReactNode;
}

export function SketchManifestProvider({
  manifest,
  children,
}: SketchManifestProviderProps) {
  // manifest는 loadSessionManifest가 freeze한 안정 참조이므로 useMemo 없이 그대로 전달한다.
  return (
    <SketchManifestContext value={manifest}>{children}</SketchManifestContext>
  );
}

export function useSketchManifest(): SketchManifest {
  const manifest = use(SketchManifestContext);
  if (manifest === null) {
    throw new Error(
      'useSketchManifest must be used within SketchManifestProvider'
    );
  }
  return manifest;
}
