// Aqi 도메인 모델을 퍼시스턴스 스냅샷 형식으로 변환합니다.
import type { Aqi } from './aqi';
import type { PersistedAqiSnapshot } from './persisted-aqi-snapshot';

export function aqiToSnapshot(aqi: Aqi): PersistedAqiSnapshot {
  return {
    locationId: aqi.locationId,
    fetchedAt: aqi.fetchedAt,
    observedAt: aqi.observedAt,
    aqi: aqi.summary.aqi,
    category: aqi.summary.category,
    source: aqi.source,
  };
}
