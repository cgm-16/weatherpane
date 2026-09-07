# 이슈 81 — Favorites 동일 탭 공유 상태 설계

## 목표

`useFavorites`가 hook 인스턴스별 `useState`를 소유하는 제약을 없애고, 동일 탭에서 동시에 마운트된 모든 소비자가 하나의 즐겨찾기 상태를 보도록 한다. 현재 Home, Detail, Favorites 페이지는 별도 라우트여서 실제로 동시에 마운트되지 않지만, 영속 셸·요약 영역·복수 토글이 추가되면 상태 분리가 제품 계약을 위반한다.

이 변경은 `AGENTS.md`와 Favorites 계약을 그대로 보존한다. 최대 6개, 수동 순서, 닉네임 20자 정규화, 정확한 undo 복원, 최신 삭제 한 건만 undo 가능, hydrate 전 안전성은 바뀌지 않는다.

## 선택한 접근

`frontend/features/favorites/` 안에 feature-local 외부 store를 두고, `useFavorites`는 `useSyncExternalStore` adapter로 만든다. store가 현재 snapshot, listener 집합, subscriber 수, 유일한 undo entry와 timer를 소유한다. 저장은 현재의 versioned `createFavoritesRepository()`를 계속 사용한다.

이 접근은 다음 대안보다 적합하다.

1. **Context provider**는 provider 배선과 소비자 트리 제약을 새로 만들며, 이슈의 작은 공유 상태 경계보다 넓다.
2. **각 hook 인스턴스가 storage를 다시 읽거나 storage event를 구독**하는 방식은 동일 탭 동기화의 단일 source를 보장하지 못하고, 승인되지 않은 cross-tab 동기화 범위를 추가한다.
3. **shared/로 store를 이동**하는 방식은 repository만 shared primitive라는 FSD 경계를 흐린다. interaction state의 소유자는 favorites feature다.

## 아키텍처와 책임

### feature-local store

새 `favorites-store.ts`(또는 동등한 private module)는 다음을 소유한다.

- referentially stable한 runtime snapshot: `favorites`, `undoEntry`, `isHydrated`
- `subscribe(listener)`, `getSnapshot()`, 고정 `getServerSnapshot()`
- `addFavorite`, `removeFavorite`, `undoRemove`, `updateNickname`, `reorderFavorites`, `isFavorite`, `atMaxFavorites`
- 첫 subscriber hydrate, 마지막 unsubscribe 정리, 하나의 5초 undo timer

`use-favorites.ts`는 React adapter와 현재 public return shape만 담당한다. Pages는 계속 `~/features/favorites`만 import하며, `index.ts`의 `AddFavoriteResult`, `RemoveFavoriteResult`, `UndoEntry` re-export와 hook의 반환 필드·action 이름·인자·반환값은 변경하지 않는다.

repository는 `frontend/shared/lib/storage/repositories/location-repositories.ts`에 남는다. store는 repository의 `getAll()` 및 `replaceAll()`만 사용하며 `weatherpane.favorites.v1`, version `1`, payload validation 또는 migration을 바꾸지 않는다.

### 안전한 SSR snapshot

module import나 SSR render 중에는 storage를 읽지 않는다. `getServerSnapshot()`과 최초 client render가 참조하는 안정적인 초기 snapshot은 항상 다음이다.

- `favorites: []`
- `undoEntry: null`
- `isHydrated: false`

따라서 서버 HTML과 첫 client render가 일치한다. hydrate 전 Home/Detail toggle의 disabled 계약도 유지되어 저장된 값을 빈 배열로 덮어쓰지 않는다.

## 데이터 흐름과 수명 주기

1. 첫 `useFavorites` 구독이 `subscribe`를 호출한다. subscriber 수가 0에서 1로 바뀔 때만 repository를 읽고, 읽은 배열과 `isHydrated: true`인 새 snapshot을 한 번 publish한다.
2. 이후 subscriber는 동일한 snapshot을 즉시 읽고 repository를 다시 읽지 않는다. snapshot이 실제로 바뀔 때만 새 객체를 만들고 listener를 notify한다.
3. action은 hook closure가 아닌 store의 현재 snapshot을 기준으로 계산한다. 성공 action은 repository `replaceAll(next)` 후 새 snapshot을 publish해 모든 subscriber가 같은 favorites, `isFavorite`, `atMaxFavorites`를 본다.
4. 삭제는 제거 전 전체 배열과 removed item을 가진 `UndoEntry`를 새로 만든다. 먼저 이전 timer를 clear하고, 새 entry를 publish한 뒤 하나의 5,000 ms timer를 등록한다. 새 삭제는 이전 entry와 timer를 교체한다.
5. undo는 entry의 전체 snapshot을 repository와 runtime snapshot에 복원하고 timer와 entry를 함께 clear한다. 만료 timer도 현재 entry만 clear한다.
6. 마지막 subscriber가 해제되면 timer를 clear하고 favorites, undo entry, hydration을 initial snapshot으로 되돌린다. storage를 clear하거나 write하지 않는다. 다음 첫 subscriber는 다시 `isHydrated: false`에서 repository를 읽고, undo entry는 항상 `null`로 시작한다.

React development Strict Mode의 subscribe/unsubscribe 재실행에서도 subscriber 수가 음수가 되지 않게 하고, 해제된 이전 session의 cleanup 또는 timer가 새 session의 state를 지우지 않도록 timer ownership을 확인한다.

## 실패와 경계 동작

- repository가 SSR 또는 storage 접근 불가로 `[]`을 반환하면 정상 hydrate 결과는 빈 배열이다. write가 no-op인 환경에서도 runtime snapshot은 action 결과를 동일 탭 subscriber에게 전달한다.
- validation/version 오류의 key 제거와 빈 배열 fallback은 기존 repository 책임으로 유지한다.
- subscriber가 남아 있는 동안 다른 탭 또는 외부 코드가 localStorage를 직접 변경해도 snapshot은 갱신하지 않는다. `storage` listener, BroadcastChannel, 서버 동기화는 추가하지 않는다.
- 모든 subscriber가 해제된 뒤 다음 session이 시작될 때만 repository를 다시 읽으므로, 그 시점의 persisted 값은 반영될 수 있다.
- UI card state, 편집 draft order, refresh queue와 weather snapshot은 이 store의 관심사가 아니다.

## 구현 인터페이스

store 내부의 subscription contract는 `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`에 맞춘다. `getSnapshot()`은 변경이 없을 때 같은 snapshot 참조를 반환해야 React의 반복 렌더 또는 cache 경고를 피할 수 있다.

`useFavorites` consumer contract는 다음을 보존한다.

- 상태: `favorites`, `undoEntry`, `isHydrated`, `atMaxFavorites`
- 조회: `isFavorite(locationId)`
- action: `addFavorite`, `removeFavorite`, `undoRemove`, `updateNickname`, `reorderFavorites`
- 결과: 기존 `'added'`, `'duplicate'`, `'max-reached'`, `'removed'`, `'not-found'` 결과

추가 성공 전 duplicate를 확인하고 6개 이상이면 차단한다. 삭제 뒤 `order`는 0부터 다시 매기며, nickname은 trim 후 20 code units로 자르고 빈 문자열을 `null`로 만든다. reorder는 전달받은 배열을 그대로 저장한다. 이 규칙은 동일 탭 공유 store로 이동할 뿐 의미가 바뀌지 않는다.

기존 `use-favorites.ts`의 단일 인스턴스 가정 주석은 구현 시 제거한다. `favorite-undo-toast.tsx`의 timer owner 설명이 있으면 store 소유와 맞게만 정정한다.

## TDD와 검증

주 테스트 위치는 `tests/use-favorites.test.ts`다. store refactor 전 아래 실패 테스트를 `renderHook`과 `act`로 추가하고, 구현 후 통과시킨다.

1. 두 hook instance에서 A의 add가 B의 favorites, `isFavorite`, `atMaxFavorites`에도 즉시 반영되며 duplicate와 7번째 추가는 shared current state를 기준으로 반환된다.
2. A의 nickname 변경과 reorder가 B와 persisted repository payload에 동일하게 반영된다.
3. A의 remove 뒤 B가 같은 하나의 undo entry를 보고, B의 undo가 position과 nickname을 포함한 전체 이전 배열을 A/B/storage에 복원한다.
4. A 삭제 뒤 B 삭제는 양쪽의 undo를 두 번째 삭제로 교체하고, fake timer 5,000 ms 뒤 양쪽 entry가 `null`이 된다.
5. persisted data가 있어도 server render는 빈 배열과 `isHydrated: false`이며, 첫 client subscriber hydrate 뒤 모든 subscriber가 같은 persisted value를 본다. 기존 hydrate 전 disabled toggle 증명은 유지한다.
6. undo timer가 존재하는 상태에서 모든 hook을 unmount한 뒤 새 hook을 mount하면 persisted removed list와 `undoEntry: null`로 시작한다. 옛 timer가 새 session의 undo를 조기 만료시키지 않음을 fake timer로 확인한다.
7. `StorageEvent` 또는 repository 직접 write가 구독 중 snapshot을 바꾸지 않음을 좁게 확인하거나, listener 미도입을 코드 검토로 명시한다.

module singleton을 도입하므로 각 test는 모든 hook을 unmount하고 fake timer를 real timer로 복구한다. 그것만으로 격리가 부족하면 public runtime API를 늘리지 않고 `vi.resetModules()` + dynamic import 또는 store-private test seam 중 하나를 사용한다. `tests/use-favorites-edit.test.ts`는 이 격리 helper가 실제로 필요할 때만 최소 조정한다.

최종 구현 PR에서는 favorites unit/integration tests, lint, typecheck, Favorites Playwright smoke, 그리고 UI 변경이 없음을 기준으로 기존 E2E 흐름을 확인한다.

## 문서와 비범위

동작 구현과 함께 `docs/specs-favorites.md`에 동일 탭 단일 runtime source와 cross-tab 미동기화를 짧게 기록한다. 제품 UX는 변하지 않으므로 UI 명세를 다시 쓰거나 legacy 서버 동기화 설계를 근거로 삼지 않는다.

다음은 명시적 비범위다.

- localStorage key, schema, payload, validation, migration 또는 repository 교체
- `storage` event, BroadcastChannel, multi-tab reconciliation, 서버 동기화
- Context provider 또는 app provider wiring
- pages, cards, undo toast UI 구조, edit draft model 변경
- 최대 개수·정렬·닉네임·undo·hydrate 제품 규칙 변경
- weather/AQI snapshot, refresh queue 동작, API consumer, dependency 변경
