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

// Dev-only mechanism for an in-app toggle (placeholder for future UI).
// Pass a storage object in tests; production uses localStorage when DEV is true.
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
