// 스냅샷 유효 기간 상수 (밀리초)
export const WEATHER_SNAPSHOT_CUTOFF_MS = 24 * 60 * 60 * 1000;
export const AQI_SNAPSHOT_CUTOFF_MS = 12 * 60 * 60 * 1000;

/**
 * 날씨 스냅샷이 24시간 cutoff 이내인지 확인합니다.
 * nowMs를 주입 가능하게 하여 테스트에서 Date.now() 모킹 없이 사용할 수 있습니다.
 */
export function isWeatherSnapshotFresh(fetchedAt: string, nowMs: number = Date.now()): boolean {
  const age = nowMs - new Date(fetchedAt).getTime();
  return age >= 0 && age < WEATHER_SNAPSHOT_CUTOFF_MS;
}

/**
 * AQI 스냅샷이 12시간 cutoff 이내인지 확인합니다.
 */
export function isAqiSnapshotFresh(fetchedAt: string, nowMs: number = Date.now()): boolean {
  const age = nowMs - new Date(fetchedAt).getTime();
  return age >= 0 && age < AQI_SNAPSHOT_CUTOFF_MS;
}
