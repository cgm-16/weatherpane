// 앱 수준의 라우트 실패 상태 모델입니다.
import type { ConfigError } from '~/shared/lib/env-config';
import type { UnsupportedRouteContext } from '~/entities/location/model/types';

export type NotFoundState = { kind: 'not-found' };

export type UnsupportedState = {
  kind: 'unsupported';
  context: UnsupportedRouteContext;
};

export type RecoverableErrorState = {
  kind: 'recoverable-error';
  message?: string;
};

export type ConfigurationErrorState = {
  kind: 'configuration-error';
  error: ConfigError;
};

export type AppRouteState =
  | NotFoundState
  | UnsupportedState
  | RecoverableErrorState
  | ConfigurationErrorState;
