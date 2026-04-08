# 스킬 작성: 메타 스킬 (TDD for Docs)

## 개요

`writing-skills` 스킬은 새 스킬을 만들거나 기존 스킬을 수정할 때 사용하는 **메타 스킬**이다. 핵심 통찰: **스킬 작성은 프로세스 문서에 적용한 TDD**이다.

## TDD 매핑

| TDD 개념 | 스킬 생성 |
|----------|----------|
| 테스트 케이스 | 서브에이전트를 사용한 압력 시나리오 |
| 프로덕션 코드 | 스킬 문서 (SKILL.md) |
| RED (실패) | 스킬 없이 에이전트가 규칙 위반 (베이스라인) |
| GREEN (통과) | 스킬 있으면 에이전트가 준수 |
| REFACTOR | 허점 발견 → 차단 → 재검증 |
| Write test first | 베이스라인 시나리오를 스킬 작성 전에 실행 |
| Watch it fail | 에이전트가 사용하는 정확한 합리화를 기록 |
| Minimal code | 해당 위반만 다루는 스킬 작성 |
| Watch it pass | 에이전트가 이제 준수하는지 검증 |
| Refactor cycle | 새 합리화 발견 → 차단 → 재검증 |

## Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
(실패하는 테스트 없이 스킬 없음)
```

새 스킬과 기존 스킬 편집 모두에 적용.

```
스킬을 테스트 전에 작성했다면? 삭제. 다시 시작.
"간단한 추가"도 예외 아님.
"문서 업데이트"도 예외 아님.
```

## 스킬 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| **Technique** | 단계를 따르는 구체적 방법 | condition-based-waiting, root-cause-tracing |
| **Pattern** | 문제에 대한 사고 방식 | flatten-with-flags, test-invariants |
| **Reference** | API 문서, 구문 가이드 | 라이브러리 참조 |

## SKILL.md 구조

### Frontmatter (YAML)

```yaml
---
name: Skill-Name-With-Hyphens
description: Use when [specific triggering conditions and symptoms]
---
```

- `name`: 문자, 숫자, 하이픈만 (괄호, 특수문자 금지)
- `description`: 3인칭, **트리거 조건만** 기술 (워크플로우 요약 금지)
- 총 1024자 이하

### 본문 구조

```markdown
# Skill Name

## Overview
핵심 원칙 1-2 문장

## When to Use
[비자명한 판단이면 인라인 플로우차트]
증상, 사용 사례 목록
사용하면 안 되는 때

## Core Pattern (technique/pattern)
Before/After 코드 비교

## Quick Reference
스캔용 테이블 또는 목록

## Implementation
인라인 코드 (간단) 또는 파일 링크 (무거운 참조)

## Common Mistakes
잘못되는 것 + 수정

## Real-World Impact (선택)
구체적 결과
```

## Claude Search Optimization (CSO)

### description 필드: 트리거 조건만, 워크플로우 요약 금지

**이것이 중요한 이유:** 테스팅에서 발견된 LLM 주의력 편향 — description이 워크플로우를 요약하면 LLM이 그것을 "바로가기"로 사용하고 스킬 본문을 건너뛴다.

```yaml
# ❌ BAD: 워크플로우를 요약 → Claude가 description만 따라감
description: Use when executing plans - dispatches subagent per task with code review between tasks
# → Claude가 리뷰를 1번만 수행 (스킬의 2단계 리뷰를 건너뜀)

# ✅ GOOD: 트리거 조건만 → Claude가 스킬 본문을 읽음
description: Use when executing implementation plans with independent tasks in the current session
# → Claude가 정확히 2단계 리뷰 수행
```

### 키워드 커버리지

Claude가 검색할 단어를 사용:
- 에러 메시지: "Hook timed out", "ENOTEMPTY", "race condition"
- 증상: "flaky", "hanging", "zombie", "pollution"
- 동의어: "timeout/hang/freeze", "cleanup/teardown/afterEach"

### 명명 규칙

```
✅ 동사 우선, 능동태:
  condition-based-waiting > async-test-helpers
  creating-skills > skill-creation
  root-cause-tracing > debugging-techniques

✅ Gerund (-ing) — 프로세스에 적합:
  creating-skills, testing-skills, debugging-with-logs
```

### 토큰 효율성

```
getting-started 워크플로우: < 150 단어
자주 로드되는 스킬: < 200 단어
기타 스킬: < 500 단어
```

## 합리화 방지 장치 (규율 스킬용)

### 허점 명시적으로 차단

```markdown
# ❌ BAD: 규칙만 기술
Write code before test? Delete it.

# ✅ GOOD: 특정 우회를 금지
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### "정신 vs 글자" 논쟁 차단

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

"정신을 따르고 있다" 류의 합리화 전체를 차단.

### 합리화 테이블 구축

베이스라인 테스트에서 에이전트가 만든 모든 변명을 수집하여 테이블로 만든다:

```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
```

### Red Flags 목록

에이전트가 스스로 합리화를 인식할 수 있는 자가 점검 장치:

```markdown
## Red Flags - STOP and Start Over
- Code before test
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "This is different because..."
```

## 설득 심리학 원칙 활용

Cialdini (2021), Meincke et al. (2025) 기반:

| 원칙 | 적용 |
|------|------|
| 권위 | "Iron Law", "HARD-GATE" — 절대적 표현 |
| 일관성 | "이미 약속한 규율" 상기 |
| 희소성 | "협상 불가" |
| 사회적 증거 | 실제 세션 데이터 ("24개 실패 기억") |

## RED-GREEN-REFACTOR for Skills

### RED: 베이스라인 (실패하는 테스트)

스킬 없이 서브에이전트에게 압력 시나리오를 실행시킨다:
- 어떤 선택을 했는가?
- 어떤 합리화를 사용했는가 (원문 그대로)?
- 어떤 압력이 위반을 유발했는가?

### GREEN: 최소 스킬 작성

베이스라인에서 발견된 합리화만 다루는 스킬을 작성한다. 가설적 경우를 위한 추가 내용 금지.

같은 시나리오를 스킬과 함께 실행. 에이전트가 이제 준수해야 한다.

### REFACTOR: 허점 차단

에이전트가 새 합리화를 발견? → 명시적 카운터 추가 → 재테스트 → 방탄될 때까지 반복.

## 스킬 유형별 테스트 방법

| 스킬 유형 | 테스트 방법 | 성공 기준 |
|-----------|-----------|----------|
| 규율 스킬 (TDD, verification) | 압력 시나리오 (시간 + 매몰비용 + 피로 결합) | 최대 압력 하에서 규칙 준수 |
| 기법 스킬 (condition-waiting) | 적용 시나리오 + 변형 + 빠진 정보 | 새 시나리오에 기법 성공 적용 |
| 패턴 스킬 (mental models) | 인식 + 적용 + 반례 | 언제 적용/비적용할지 정확 판단 |
| 참조 스킬 (API docs) | 검색 + 적용 + 빈 곳 | 정보를 찾아 올바르게 적용 |

## 스킬 생성 체크리스트

```
RED Phase:
- [ ] 압력 시나리오 생성 (규율 스킬은 3+ 결합 압력)
- [ ] 스킬 없이 시나리오 실행 — 베이스라인 기록
- [ ] 합리화/실패 패턴 식별

GREEN Phase:
- [ ] name: 문자, 숫자, 하이픈만
- [ ] description: "Use when..." + 트리거 조건만
- [ ] 베이스라인 실패를 구체적으로 다루는 내용
- [ ] 스킬과 함께 시나리오 실행 — 준수 확인

REFACTOR Phase:
- [ ] 새 합리화 식별
- [ ] 명시적 카운터 추가
- [ ] 합리화 테이블 구축
- [ ] Red Flags 목록 생성
- [ ] 방탄될 때까지 재테스트

Quality:
- [ ] 비자명한 판단에만 플로우차트
- [ ] Quick reference 테이블
- [ ] Common mistakes 섹션
- [ ] 내러티브 스토리텔링 없음

Deploy:
- [ ] git 커밋 및 push
```

## 핵심 요약

```
스킬 생성 = 프로세스 문서에 적용한 TDD
같은 Iron Law: 실패하는 테스트 없이 스킬 없음
같은 사이클: RED (베이스라인) → GREEN (스킬 작성) → REFACTOR (허점 차단)
```
