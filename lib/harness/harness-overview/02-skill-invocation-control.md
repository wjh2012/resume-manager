# 스킬 호출 제어: `using-superpowers`

## 개요

`using-superpowers`는 전체 하네스의 **최상위 게이트**이다. 모든 세션에 자동 주입되어, 에이전트가 어떤 행동이든 하기 전에 적절한 스킬을 호출하도록 강제한다.

## 절대적 호출 규칙

```
1% 가능성만 있어도 → 반드시 Skill tool 호출
스킬이 맞지 않으면 → 호출 후 사용하지 않아도 됨
확실히 적용되지 않을 때만 → 직접 응답
```

이것은 선택이 아닌 강제다:

> *"IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT."*
> *"This is not negotiable. This is not optional. You cannot rationalize your way out of this."*

## 우선순위 계층

```
1위: 사용자 명시 지시 (CLAUDE.md, GEMINI.md, AGENTS.md, 직접 요청)
2위: Superpowers 스킬
3위: 기본 시스템 프롬프트
```

사용자가 "TDD 쓰지 마"라고 하면 TDD 스킬이 있어도 사용자 지시가 우선한다. **통제권은 항상 사용자에게** 있다.

## 합리화 방지 테이블 (11개 Red Flag)

에이전트가 스킬 호출을 건너뛸 때 사용하는 전형적 자기 합리화를 명시적으로 나열하고, 각각에 대해 반박한다:

| 합리화 사고 | 현실 |
|-------------|------|
| "간단한 질문일 뿐이다" | 질문도 태스크. 스킬 확인 필수 |
| "먼저 컨텍스트가 필요하다" | 스킬 확인이 명확화 질문보다 먼저 |
| "코드베이스를 먼저 탐색하자" | 스킬이 탐색 방법을 알려줌 |
| "빠르게 git/파일 확인하자" | 파일에는 대화 컨텍스트가 없음 |
| "이건 형식적 스킬이 필요 없다" | 스킬이 있으면 사용 |
| "이 스킬을 기억한다" | 스킬은 진화함. 현재 버전을 읽기 |
| "이건 태스크가 아니다" | 행동 = 태스크 |
| "스킬은 과하다" | 간단한 것이 복잡해질 수 있음 |
| "먼저 이것만 하자" | 뭐든 하기 전에 체크 |
| "생산적인 느낌이다" | 무규율 행동은 시간 낭비 |
| "무슨 뜻인지 안다" | 개념을 아는 것 ≠ 스킬을 쓰는 것 |

**설계 원리**: 인지 행동 치료의 "자동 사고 인식" 기법과 유사하다. 특정 사고 패턴을 인식하면 자동으로 STOP 신호를 발생시킨다.

## 의사결정 플로우차트

스킬은 DOT 다이어그램으로 정확한 의사결정 트리를 제공한다:

```
User message received
  │
  ├── About to EnterPlanMode? → Already brainstormed?
  │   ├── No → Invoke brainstorming skill
  │   └── Yes → Continue
  │
  ▼
Might any skill apply?
  ├── Yes (1%) → Invoke Skill tool
  │   └── Announce "Using [skill] to [purpose]"
  │       └── Has checklist?
  │           ├── Yes → Create TodoWrite per item → Follow skill
  │           └── No → Follow skill
  └── Definitely not → Respond
```

## 스킬 우선순위

다수 스킬이 적용 가능할 때:

```
1순위: 프로세스 스킬 (brainstorming, debugging) — HOW를 결정
2순위: 구현 스킬 (frontend-design 등) — 실행을 안내

예시:
  "X를 만들자" → brainstorming 먼저 → 구현 스킬
  "이 버그 수정해" → debugging 먼저 → 도메인 스킬
```

## 스킬 유형

| 유형 | 특징 | 예시 |
|------|------|------|
| **Rigid** | 정확히 따라야 함, 재량 불가 | TDD, debugging |
| **Flexible** | 원칙을 맥락에 맞게 적용 | 패턴 스킬 |

## 서브에이전트 예외

```xml
<SUBAGENT-STOP>
서브에이전트로 디스패치된 경우 이 스킬을 건너뛴다.
</SUBAGENT-STOP>
```

서브에이전트는 컨트롤러가 이미 적절한 스킬을 선택해서 보냈으므로, 다시 스킬 탐색을 할 필요가 없다.

## 사용자 지시와 스킬의 관계

```
사용자 지시 = WHAT (무엇을 할지)
스킬 = HOW (어떻게 할지)

"X를 추가해" = what
"TDD로", "설계 먼저" = how (스킬이 결정)

사용자가 WHAT만 말해도 스킬은 HOW를 적용한다.
```

## 핵심 요약

| 원리 | 설명 |
|------|------|
| 1% 규칙 | 가능성이 있으면 무조건 호출 |
| 사용자 최우선 | 명시 지시 > 스킬 > 시스템 프롬프트 |
| 합리화 차단 | 11개 Red Flag으로 전형적 우회 사고 차단 |
| 프로세스 우선 | 프로세스 스킬 → 구현 스킬 순서 |
| 서브에이전트 예외 | 디스패치된 에이전트는 건너뜀 |
