// 위경도를 소수점 2자리(~1.1km)로 반올림한다. 클라이언트측 호출에서는 CDN 캐시 키를
// 정규화하고, 서버측 호출에서는 업스트림에 보내는 좌표 정밀도를 제한한다.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
