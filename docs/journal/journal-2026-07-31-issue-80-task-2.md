# Issue #80 Task 2 작업 메모

- 기본 검색은 `catalog.search.generated.json`의 압축 튜플을 동기적으로 순회해야 하며 전체 `CatalogEntry` 목록을 준비하면 안 된다.
- 상세의 기본 ID 조회는 `catalog.lookup.generated.json`의 12자 ID 슬라이스와 일치하는 한 항목만 복원해야 한다.
- 검색 선택은 검색 산출물에서 단건 복원하고 상세 조회 산출물을 가져오면 안 된다.
- 외부 계약(검색 순위, URL/IME, 수동 오버라이드→지오코딩→미지원, 활성 위치 안전성)은 변경하지 않는다.
