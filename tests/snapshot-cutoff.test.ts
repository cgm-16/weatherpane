import { describe, expect, test } from 'vitest';
import {
  WEATHER_SNAPSHOT_CUTOFF_MS,
  AQI_SNAPSHOT_CUTOFF_MS,
  isWeatherSnapshotFresh,
  isAqiSnapshotFresh,
} from '../frontend/features/app-bootstrap/snapshot-cutoff';

const NOW = Date.now();

describe('constants', () => {
  test('WEATHER_SNAPSHOT_CUTOFF_MS는 24시간이다', () => {
    expect(WEATHER_SNAPSHOT_CUTOFF_MS).toBe(24 * 60 * 60 * 1000);
  });
  test('AQI_SNAPSHOT_CUTOFF_MS는 12시간이다', () => {
    expect(AQI_SNAPSHOT_CUTOFF_MS).toBe(12 * 60 * 60 * 1000);
  });
});

describe('isWeatherSnapshotFresh', () => {
  test('1초 전 스냅샷은 유효하다', () => {
    expect(isWeatherSnapshotFresh(new Date(NOW - 1_000).toISOString(), NOW)).toBe(true);
  });
  test('23h 59m 전 스냅샷은 유효하다', () => {
    expect(isWeatherSnapshotFresh(new Date(NOW - (24 * 3_600_000 - 60_000)).toISOString(), NOW)).toBe(true);
  });
  test('정확히 24h 된 스냅샷은 무효하다', () => {
    expect(isWeatherSnapshotFresh(new Date(NOW - 24 * 3_600_000).toISOString(), NOW)).toBe(false);
  });
  test('25h 된 스냅샷은 무효하다', () => {
    expect(isWeatherSnapshotFresh(new Date(NOW - 25 * 3_600_000).toISOString(), NOW)).toBe(false);
  });
  test('미래 타임스탬프는 무효하다 (클럭 왜곡 방지)', () => {
    expect(isWeatherSnapshotFresh(new Date(NOW + 5_000).toISOString(), NOW)).toBe(false);
  });
});

describe('isAqiSnapshotFresh', () => {
  test('1초 전 스냅샷은 유효하다', () => {
    expect(isAqiSnapshotFresh(new Date(NOW - 1_000).toISOString(), NOW)).toBe(true);
  });
  test('11h 59m 전 스냅샷은 유효하다', () => {
    expect(isAqiSnapshotFresh(new Date(NOW - (12 * 3_600_000 - 60_000)).toISOString(), NOW)).toBe(true);
  });
  test('정확히 12h 된 스냅샷은 무효하다', () => {
    expect(isAqiSnapshotFresh(new Date(NOW - 12 * 3_600_000).toISOString(), NOW)).toBe(false);
  });
  test('13h 된 스냅샷은 무효하다', () => {
    expect(isAqiSnapshotFresh(new Date(NOW - 13 * 3_600_000).toISOString(), NOW)).toBe(false);
  });
  test('미래 타임스탬프는 무효하다', () => {
    expect(isAqiSnapshotFresh(new Date(NOW + 5_000).toISOString(), NOW)).toBe(false);
  });
});
