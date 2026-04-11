import { describe, expect, test, vi, afterEach } from 'vitest';

import {
  parseAppConfig,
  getDevProviderModeOverride,
} from '../frontend/shared/lib/env-config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseAppConfig', () => {
  test('환경 변수가 설정되지 않은 경우 ConfigError를 반환한다', () => {
    vi.stubEnv('VITE_WEATHER_PROVIDER_MODE', '');

    const result = parseAppConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_PROVIDER_MODE');
      expect(result.error.field).toBe('VITE_WEATHER_PROVIDER_MODE');
      expect(result.error.message).toContain('required');
    }
  });

  test('returns mock config when env var is "mock"', () => {
    vi.stubEnv('VITE_WEATHER_PROVIDER_MODE', 'mock');

    const result = parseAppConfig();

    expect(result).toEqual({ ok: true, config: { providerMode: 'mock' } });
  });

  test('returns real config when env var is "real"', () => {
    vi.stubEnv('VITE_WEATHER_PROVIDER_MODE', 'real');

    const result = parseAppConfig();

    expect(result).toEqual({ ok: true, config: { providerMode: 'real' } });
  });

  test('returns ConfigError when env var is an unrecognized value', () => {
    vi.stubEnv('VITE_WEATHER_PROVIDER_MODE', 'garbage');

    const result = parseAppConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_PROVIDER_MODE');
      expect(result.error.field).toBe('VITE_WEATHER_PROVIDER_MODE');
      expect(result.error.message).toContain('garbage');
    }
  });
});

describe('getDevProviderModeOverride', () => {
  test('returns null when storage has no override key', () => {
    const storage = { getItem: () => null };

    const result = getDevProviderModeOverride(storage);

    expect(result).toBeNull();
  });

  test('returns "mock" when storage has __wp_dev_provider_mode set to "mock"', () => {
    const storage = { getItem: () => 'mock' };

    const result = getDevProviderModeOverride(storage);

    expect(result).toBe('mock');
  });

  test('returns "real" when storage has __wp_dev_provider_mode set to "real"', () => {
    const storage = { getItem: () => 'real' };

    const result = getDevProviderModeOverride(storage);

    expect(result).toBe('real');
  });

  test('returns null when storage has an unrecognized override value', () => {
    const storage = { getItem: () => 'invalid' };

    const result = getDevProviderModeOverride(storage);

    expect(result).toBeNull();
  });

  test('returns null in production mode regardless of storage', () => {
    const storage = { getItem: () => 'real' };

    const result = getDevProviderModeOverride(storage, false);

    expect(result).toBeNull();
  });
});
