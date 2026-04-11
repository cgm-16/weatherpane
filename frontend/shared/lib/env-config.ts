export type ProviderMode = 'mock' | 'real';

export interface AppConfig {
  providerMode: ProviderMode;
}

export interface ConfigError {
  code: 'INVALID_PROVIDER_MODE';
  message: string;
  field: string;
}

export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; error: ConfigError };

export function parseAppConfig(): ConfigResult {
  const raw = import.meta.env.VITE_WEATHER_PROVIDER_MODE;

  if (!raw || raw === 'mock') {
    return { ok: true, config: { providerMode: 'mock' } };
  }

  if (raw === 'real') {
    return { ok: true, config: { providerMode: 'real' } };
  }

  return {
    ok: false,
    error: {
      code: 'INVALID_PROVIDER_MODE',
      field: 'VITE_WEATHER_PROVIDER_MODE',
      message: `Invalid provider mode: "${raw}". Expected "mock" or "real".`,
    },
  };
}

// 잘못된 설정은 프로덕션에서 명시적으로 오류를 발생시킵니다. 개발 및 테스트 환경에서는 mock으로 폴백합니다.
export function assertConfigInProduction(
  result: ConfigResult,
  isDev: boolean = import.meta.env.DEV
): void {
  if (!isDev && !result.ok) {
    throw new Error(
      `[ConfigError:${result.error.code}] ${result.error.field} - ${result.error.message}`
    );
  }
}

// 인앱 토글을 위한 개발 전용 메커니즘 (향후 UI 구현을 위한 플레이스홀더).
// 테스트에서는 스토리지 객체를 전달하고, 배포 환경에서는 DEV가 true일 때 localStorage를 사용합니다.
export function getDevProviderModeOverride(
  storage?: Pick<Storage, 'getItem'>,
  isDev: boolean = import.meta.env.DEV
): ProviderMode | null {
  if (!isDev) return null;

  const store =
    storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return null;

  const raw = store.getItem('__wp_dev_provider_mode');
  if (raw === 'mock' || raw === 'real') return raw;
  return null;
}
