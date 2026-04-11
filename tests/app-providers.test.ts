import { describe, expect, test } from 'vitest';

import { assertConfigInProduction } from '../frontend/shared/lib/env-config';

describe('assertConfigInProduction', () => {
  test('프로덕션 환경에서 설정이 잘못된 경우 오류를 던진다', () => {
    const result = {
      ok: false as const,
      error: {
        code: 'INVALID_PROVIDER_MODE' as const,
        field: 'VITE_WEATHER_PROVIDER_MODE',
        message: 'Invalid provider mode: "garbage". Expected "mock" or "real".',
      },
    };

    expect(() => assertConfigInProduction(result, false)).toThrow(
      '[ConfigError:INVALID_PROVIDER_MODE] VITE_WEATHER_PROVIDER_MODE - Invalid provider mode'
    );
  });

  test('개발 환경에서는 설정이 잘못되어도 오류를 던지지 않는다', () => {
    const result = {
      ok: false as const,
      error: {
        code: 'INVALID_PROVIDER_MODE' as const,
        field: 'VITE_WEATHER_PROVIDER_MODE',
        message: 'Invalid provider mode: "garbage". Expected "mock" or "real".',
      },
    };

    expect(() => assertConfigInProduction(result, true)).not.toThrow();
  });

  test('설정이 유효하면 프로덕션에서도 오류를 던지지 않는다', () => {
    const result = {
      ok: true as const,
      config: { providerMode: 'mock' as const },
    };

    expect(() => assertConfigInProduction(result, false)).not.toThrow();
  });
});
