# Codex `next-issue-to-pr` 래퍼 설계

## 목표

Codex가 Weatherpane 저장소에서 `$next-issue-to-pr`를 직접 호출할 수 있게 한다. 기존 `.claude/skills/next-issue-to-pr`는 워크플로의 단일 진실 공급원으로 유지하고, Codex 전용 스킬은 원본을 찾아 위임하는 역할만 담당한다.

## 범위

포함 범위:

- `.agents/skills/next-issue-to-pr/SKILL.md`
- `.agents/skills/next-issue-to-pr/agents/openai.yaml`
- 스킬 구조 검증과 새 컨텍스트 위임 평가

제외 범위:

- 기존 Claude 스킬 본문 또는 지원 파일 변경
- 스크립트, 테스트, 평가 파일 복사
- 이슈 선택, 구현, 검토, PR 생성 정책 변경
- 애플리케이션 코드 또는 사용자 UI 변경

## 구조

```text
.agents/skills/next-issue-to-pr/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`SKILL.md`는 Codex가 스킬을 검색하고 실행하는 진입점이다. `agents/openai.yaml`은 스킬 선택 UI에 표시할 이름, 짧은 설명, 기본 호출 프롬프트만 제공한다. 별도 `scripts/`, `references/`, `assets/`는 만들지 않는다.

## 위임 흐름

1. Codex가 `$next-issue-to-pr` 명시 호출 또는 설명 기반 암시 호출로 래퍼를 읽는다.
2. 래퍼는 `git rev-parse --show-toplevel`로 현재 Weatherpane 저장소 루트를 확인한다.
3. 저장소 루트의 `.claude/skills/next-issue-to-pr/SKILL.md`를 처음부터 끝까지 읽는다.
4. 원본 스킬이 요구하는 관련 저장소 문서와 적용 가능한 런타임 스킬을 읽는다.
5. 원본 워크플로를 권위 있는 절차로 실행한다.

래퍼는 원본 워크플로 단계를 요약하거나 복제하지 않는다. 원본의 이식성 메모가 현재 Codex 런타임에 실제로 제공된 도구나 스킬과 충돌하면, 현재 런타임에서 확인된 기능을 우선한다. 이 예외는 원본의 업무 규칙을 바꾸지 않고 런타임 기능 설명의 노후화만 방지한다.

## 오류 처리

- Git 저장소 루트를 확인할 수 없으면 실행을 중단하고 Ori에게 현재 경로와 실패 명령을 알린다.
- 원본 스킬이 없거나 읽을 수 없으면 실행을 중단하고 누락된 절대 경로를 알린다.
- 원본 내용을 기억이나 래퍼 본문으로 재구성하지 않는다.

## 검증

RED 단계에서는 래퍼가 없는 새 컨텍스트에서 `$next-issue-to-pr`를 사용할 수 없거나 원본으로 위임되지 않는 사실을 기록한다.

GREEN 단계에서는 다음을 확인한다.

- `quick_validate.py`가 스킬 폴더를 통과한다.
- YAML에는 필수 필드와 승인된 UI 메타데이터만 있다.
- 새 컨텍스트에서 래퍼가 원본 스킬의 절대 경로를 해석하고 전체 내용을 읽는다.
- 래퍼가 원본 워크플로를 복제하거나 다른 동작을 발명하지 않는다.

## 완료 조건

- 이슈 #101과 연결된 기능 브랜치에는 이 설계 문서와 래퍼 파일만 추가된다.
- 검증 결과가 실제 명령 및 평가 출력으로 남는다.
- PR은 비범위, 검증 근거, 위험, 롤백 방법을 명시한다.
