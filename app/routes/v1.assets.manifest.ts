// 원격 에셋 오버라이드 매니페스트 엔드포인트.
// 현재는 빈 오브젝트를 반환한다 — 오버라이드 없음 = baseline 매니페스트 사용.
export async function loader() {
  return Response.json({});
}
