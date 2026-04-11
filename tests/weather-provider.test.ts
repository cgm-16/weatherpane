import { describe, expect, test } from 'vitest';

import { mockWeatherProvider } from '../frontend/shared/api/mock-weather-provider';
import { realWeatherProvider } from '../frontend/shared/api/real-weather-provider';
import { createWeatherProvider } from '../frontend/shared/api/create-weather-provider';

describe('mockWeatherProvider', () => {
  test('has mode "mock"', () => {
    expect(mockWeatherProvider.mode).toBe('mock');
  });
});

describe('realWeatherProvider', () => {
  test('has mode "real"', () => {
    expect(realWeatherProvider.mode).toBe('real');
  });
});

describe('createWeatherProvider', () => {
  test('returns mock provider when mode is "mock"', () => {
    const provider = createWeatherProvider('mock');

    expect(provider.mode).toBe('mock');
  });

  test('returns real provider when mode is "real"', () => {
    const provider = createWeatherProvider('real');

    expect(provider.mode).toBe('real');
  });

  test('is deterministic — same mode always returns same object', () => {
    const a = createWeatherProvider('mock');
    const b = createWeatherProvider('mock');

    expect(a).toBe(b);
  });
});
