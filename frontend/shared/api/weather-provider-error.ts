export type WeatherProviderErrorCode =
  | 'PROVIDER_NOT_IMPLEMENTED'
  | 'INVALID_PROVIDER_RESPONSE';

interface WeatherProviderErrorOptions {
  code: WeatherProviderErrorCode;
  provider: string;
  message: string;
  cause?: unknown;
}

export class WeatherProviderError extends Error {
  readonly code: WeatherProviderErrorCode;
  readonly provider: string;
  override readonly cause?: unknown;

  constructor({ code, provider, message, cause }: WeatherProviderErrorOptions) {
    super(message);
    this.name = 'WeatherProviderError';
    this.code = code;
    this.provider = provider;
    this.cause = cause;
  }
}

export function isWeatherProviderError(
  value: unknown
): value is WeatherProviderError {
  return value instanceof WeatherProviderError;
}

export function normalizeWeatherProviderError(
  error: unknown,
  fallback: Omit<WeatherProviderErrorOptions, 'cause'>
): WeatherProviderError {
  if (isWeatherProviderError(error)) {
    return error;
  }

  return new WeatherProviderError({
    ...fallback,
    cause: error,
  });
}
