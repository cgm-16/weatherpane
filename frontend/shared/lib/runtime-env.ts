// 런타임 환경 여부를 반환합니다. 테스트에서 모킹 가능하도록 함수로 분리합니다.
export function isProduction(): boolean {
  return import.meta.env.PROD;
}
