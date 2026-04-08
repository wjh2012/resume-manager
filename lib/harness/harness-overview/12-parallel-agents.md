# 병렬 에이전트 디스패치

## 개요

`dispatching-parallel-agents` 스킬은 2개 이상의 독립적인 태스크가 공유 상태나 순차 의존성 없이 작업 가능할 때 사용한다. 문제 도메인당 하나의 에이전트를 디스패치하여 동시에 작업시킨다.

## 핵심 원리

```
독립 문제 도메인당 1 에이전트 디스패치 → 동시 작업
```

## 사용 조건

```
다수 실패 발생?
  └── Yes → 독립적인가?
       └── Yes → 병렬 작업 가능?
            └── Yes → 병렬 디스패치
            └── No (공유 상태) → 순차 에이전트
       └── No (관련됨) → 단일 에이전트가 전체 조사
  └── No → 해당 없음
```

### 사용해야 하는 때

- 3+ 테스트 파일이 다른 근본 원인으로 실패
- 여러 서브시스템이 독립적으로 고장
- 각 문제가 다른 문제의 맥락 없이 이해 가능
- 조사 간 공유 상태 없음

### 사용하면 안 되는 때

- 실패가 관련됨 (하나를 고치면 다른 것도 고쳐질 수 있음)
- 전체 시스템 상태 이해가 필요
- 에이전트가 서로 간섭 (같은 파일 편집, 같은 리소스 사용)
- 탐색적 디버깅 (뭐가 고장인지 아직 모름)

## 패턴

### 1. 독립 도메인 식별

실패를 고장 영역별로 그룹화:

```
File A 테스트: 도구 승인 흐름
File B 테스트: 배치 완료 동작
File C 테스트: 중단 기능
```

각 도메인이 독립적 — 도구 승인 수정이 중단 테스트에 영향 없음.

### 2. 집중된 에이전트 태스크 생성

각 에이전트에게 제공:

| 요소 | 내용 |
|------|------|
| **범위** | 하나의 테스트 파일 또는 서브시스템 |
| **목표** | "이 테스트들을 통과시켜라" |
| **제약** | "다른 코드 변경하지 마라" |
| **기대 출력** | "발견한 것과 수정한 것 요약" |

### 3. 병렬 디스패치

```
Agent 1 → Fix agent-tool-abort.test.ts
Agent 2 → Fix batch-completion-behavior.test.ts
Agent 3 → Fix tool-approval-race-conditions.test.ts
# 세 에이전트 동시 실행
```

### 4. 리뷰와 통합

에이전트 반환 시:
1. 각 요약 읽기
2. 수정 간 충돌 확인
3. 전체 테스트 스위트 실행
4. 모든 변경 통합

## 에이전트 프롬프트 품질 기준

### 좋은 프롬프트 vs 나쁜 프롬프트

```markdown
# ❌ BAD: 너무 광범위
"Fix all the tests"

# ✅ GOOD: 구체적 범위
"Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts"
```

```markdown
# ❌ BAD: 컨텍스트 없음
"Fix the race condition"

# ✅ GOOD: 에러 메시지와 테스트 이름 포함
"Fix these 3 tests:
1. 'should abort tool with partial output capture' - expects 'interrupted at'
2. 'should handle mixed completed and aborted tools' - fast tool aborted
3. 'should properly track pendingToolCount' - expects 3 results but gets 0"
```

```markdown
# ❌ BAD: 제약 없음
"Fix it"

# ✅ GOOD: 명확한 제약
"Do NOT just increase timeouts - find the real issue.
Do NOT change production code outside this module."
```

```markdown
# ❌ BAD: 모호한 출력
"Fix it"

# ✅ GOOD: 구체적 출력 요청
"Return: Summary of what you found and what you fixed."
```

## 실제 사례

**시나리오:** 대규모 리팩토링 후 3개 파일에서 6개 테스트 실패

```
실패 분석:
- agent-tool-abort.test.ts: 3개 실패 (타이밍 이슈)
- batch-completion-behavior.test.ts: 2개 실패 (도구 미실행)
- tool-approval-race-conditions.test.ts: 1개 실패 (실행 횟수 = 0)

결정: 독립 도메인 — abort 로직, batch 완료, race condition 각각 분리

디스패치:
  Agent 1 → agent-tool-abort.test.ts
  Agent 2 → batch-completion-behavior.test.ts
  Agent 3 → tool-approval-race-conditions.test.ts

결과:
  Agent 1: 타임아웃을 이벤트 기반 대기로 교체
  Agent 2: 이벤트 구조 버그 수정 (threadId 위치 잘못됨)
  Agent 3: 비동기 도구 실행 완료 대기 추가

통합: 모든 수정 독립적, 충돌 없음, 전체 스위트 green
시간 절약: 순차 대비 1/3 시간
```

## 검증 절차

에이전트 반환 후:

1. **각 요약 리뷰** — 무엇이 변경되었는지 이해
2. **충돌 확인** — 에이전트들이 같은 코드를 편집했는가?
3. **전체 스위트 실행** — 모든 수정이 함께 작동하는지
4. **스팟 체크** — 에이전트가 체계적 오류를 만들 수 있음

## 핵심 이점

| 이점 | 설명 |
|------|------|
| 병렬화 | 여러 조사가 동시에 진행 |
| 집중 | 각 에이전트가 좁은 범위만 추적 |
| 독립성 | 에이전트 간 간섭 없음 |
| 속도 | 3개 문제를 1개 시간에 해결 |
