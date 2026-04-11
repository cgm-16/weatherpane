import { describe, expect, test } from 'vitest';
import { weatherQueryKeys } from '../frontend/features/weather-queries/query-keys';

describe('weatherQueryKeys', () => {
  describe('coreWeather', () => {
    test('key starts with ["weather", "core"]', () => {
      const key = weatherQueryKeys.coreWeather('loc_abc');
      expect(key[0]).toBe('weather');
      expect(key[1]).toBe('core');
    });

    test('key includes locationId as third element', () => {
      const key = weatherQueryKeys.coreWeather('loc_abc');
      expect(key[2]).toBe('loc_abc');
    });

    test('different locationIds produce different keys', () => {
      const a = weatherQueryKeys.coreWeather('loc_aaa');
      const b = weatherQueryKeys.coreWeather('loc_bbb');
      expect(a).not.toEqual(b);
    });
  });

  describe('aqi', () => {
    test('key starts with ["weather", "aqi"]', () => {
      const key = weatherQueryKeys.aqi('loc_abc');
      expect(key[0]).toBe('weather');
      expect(key[1]).toBe('aqi');
    });

    test('key includes locationId as third element', () => {
      const key = weatherQueryKeys.aqi('loc_abc');
      expect(key[2]).toBe('loc_abc');
    });

    test('coreWeather and aqi keys differ for same locationId', () => {
      const cw = weatherQueryKeys.coreWeather('loc_abc');
      const aq = weatherQueryKeys.aqi('loc_abc');
      expect(cw).not.toEqual(aq);
    });
  });
});
