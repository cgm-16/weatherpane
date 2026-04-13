// 위치/날씨 조건에 맞는 스케치 배경을 렌더링하는 컴포넌트.
// 레이아웃/포지셔닝은 페이지가 소유한다. 여기서는 소스 결정과 폴백만 담당한다.
import { useState } from 'react';

import type {
  RawGpsFallbackLocation,
  ResolvedLocation,
} from '../../location/model/types';
import type { WeatherCondition } from '../../weather/model/core-weather';
import { BASELINE_MANIFEST } from '../model/manifest';
import { selectSketchKey } from '../model/selector';

import { useSketchManifest } from './sketch-manifest-context';

export interface SketchBackgroundProps {
  location: ResolvedLocation | RawGpsFallbackLocation;
  condition: WeatherCondition;
  className?: string;
  sizeHint?: 'hero' | 'compact';
}

export function SketchBackground({
  location,
  condition,
  className,
  sizeHint,
}: SketchBackgroundProps) {
  const manifest = useSketchManifest();
  const key = selectSketchKey(location, condition);

  // override가 없으면 baseline으로, 그것도 없으면 undefined.
  const overrideSrc = manifest[key];
  const baselineSrc = BASELINE_MANIFEST[key];
  const initialSrc = overrideSrc ?? baselineSrc;

  // 한 번의 재시도만 허용: override → baseline → 포기(hidden).
  // attempt 0: override(또는 baseline 단일) / attempt 1: baseline / attempt 2: 포기
  const [attempt, setAttempt] = useState<0 | 1 | 2>(0);

  if (initialSrc === undefined) {
    // 키가 매니페스트에 전혀 없으면 레이아웃을 깨지 않기 위해 아무것도 렌더링하지 않는다.
    return null;
  }

  let currentSrc: string | undefined = initialSrc;
  if (attempt === 1) {
    currentSrc = baselineSrc;
  } else if (attempt === 2) {
    currentSrc = baselineSrc;
  }

  const hasOverrideRetry =
    overrideSrc !== undefined &&
    baselineSrc !== undefined &&
    overrideSrc !== baselineSrc;

  function handleError() {
    if (attempt === 0 && hasOverrideRetry) {
      // override 실패 → baseline으로 스왑
      setAttempt(1);
      return;
    }
    // baseline도 실패(또는 override 재시도 대상 아님) → 포기
    setAttempt(2);
  }

  const baseClass = 'pointer-events-none select-none';
  const composedClass =
    attempt === 2
      ? 'hidden'
      : className
        ? `${baseClass} ${className}`
        : baseClass;

  return (
    <img
      src={currentSrc}
      alt=""
      loading="lazy"
      decoding="async"
      data-sketch-key={key}
      data-size-hint={sizeHint ?? 'hero'}
      className={composedClass}
      onError={handleError}
    />
  );
}
