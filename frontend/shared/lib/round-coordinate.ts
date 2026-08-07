// 위경도를 소수점 2자리(~1.1km)로 반올림한다. 인접 좌표를 같은 CDN 캐시 키/업스트림
// 호출로 모으고, 프록시로 전달되는 좌표 정밀도를 제한하기 위한 헬퍼.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
