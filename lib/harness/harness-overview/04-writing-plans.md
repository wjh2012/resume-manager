# 계획 작성: 컨텍스트-프리 실행 청사진

## 개요

`writing-plans` 스킬은 스펙이나 요구사항이 있을 때, 코드를 작성하기 전에 사용한다. 구현 엔지니어(서브에이전트)가 코드베이스에 대한 컨텍스트 없이도 완벽하게 실행할 수 있는 **자기 충족적 실행 계획**을 작성한다.

## 핵심 전제: Zero Context 엔지니어

```
"코드베이스에 대한 컨텍스트가 전혀 없고 취향이 의심스러운 엔지니어를 가정하라.
어떤 파일을 건드려야 하는지, 코드, 테스팅, 확인할 문서,
테스트 방법 등 알아야 할 모든 것을 문서화하라."
```

이 전제는 서브에이전트가 **세션 히스토리 없이** 태스크를 수행해야 하기 때문에 필수적이다. 계획 자체가 완전한 지침이 되어야 한다.

## 파일 구조 선행

태스크 정의 **전에** 파일 구조를 먼저 매핑한다:

```
- 명확한 경계와 잘 정의된 인터페이스
- 각 파일이 하나의 명확한 책임
- 함께 변경되는 파일은 함께 배치
- 책임별 분리, 기술 계층별 분리가 아님
- 기존 코드베이스에서는 기존 패턴 따름
```

이 구조가 태스크 분해를 결정한다. 각 태스크는 독립적으로 의미 있는 변경을 생산해야 한다.

## Bite-Sized 태스크 세분화

각 스텝은 **하나의 행동 (2-5분)**:

```
"실패하는 테스트 작성"         — 스텝
"실패 확인을 위해 실행"        — 스텝
"테스트 통과 최소 코드 구현"   — 스텝
"테스트 실행하고 통과 확인"    — 스텝
"커밋"                        — 스텝
```

## 플랜 문서 헤더 (필수)

모든 계획은 다음 헤더로 시작해야 한다:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [한 문장으로 목표]
**Architecture:** [2-3 문장으로 접근법]
**Tech Stack:** [핵심 기술/라이브러리]

---
```

## 태스크 구조

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders 원칙

계획에서 **절대 허용되지 않는** 표현들. 이것들은 **계획 실패**로 간주된다:

| 금지 표현 | 이유 |
|-----------|------|
| "TBD", "TODO", "implement later" | 엔지니어에게 결정을 전가 |
| "Add appropriate error handling" | 구체적 코드 없이 모호한 지시 |
| "Write tests for the above" | 실제 테스트 코드가 없음 |
| "Similar to Task N" | 순서 무관 읽기 가능해야 함, 코드 반복 필수 |
| 코드 블록 없이 무엇만 설명 | 어떻게(코드)가 없으면 무의미 |
| 정의되지 않은 타입/함수 참조 | 어떤 태스크에서도 정의되지 않았으면 사용 불가 |

## 범위 확인

```
스펙이 다수의 독립 서브시스템을 다루면:
  → 브레인스토밍에서 분해되었어야 함
  → 안 되었으면 서브시스템별 별도 계획 제안
  → 각 계획이 독립적으로 동작하고 테스트 가능한 소프트웨어 생산
```

## 셀프 리뷰 (3단계)

계획 작성 후 반드시 수행:

### 1. 스펙 커버리지
스펙의 각 섹션/요구사항을 훑으며, 이를 구현하는 태스크를 가리킬 수 있는지 확인. 빈 곳이 있으면 태스크 추가.

### 2. Placeholder 스캔
"No Placeholders" 패턴 검색. 발견 시 수정.

### 3. 타입 일관성
이후 태스크에서 사용한 타입, 메서드 시그니처, 프로퍼티 이름이 이전 태스크에서 정의한 것과 일치하는지 확인.

```
예: Task 3에서 clearLayers()로 정의했는데 Task 7에서 clearFullLayers()로 사용 = 버그
```

## 실행 핸드오프

계획 저장 후 실행 방식 선택 제시:

```
1. Subagent-Driven (권장)
   → superpowers:subagent-driven-development 사용
   → 태스크당 fresh 서브에이전트 + 2단계 리뷰

2. Inline Execution
   → superpowers:executing-plans 사용
   → 현재 세션 배치 실행 + 체크포인트
```

## 핵심 원칙 요약

| 원칙 | 설명 |
|------|------|
| Zero Context | 코드베이스를 모르는 엔지니어가 실행 가능해야 함 |
| 정확한 파일 경로 | 항상 정확한 경로 포함 |
| 완전한 코드 | 모든 코드 스텝에 코드 블록 포함 |
| 정확한 명령어 | 예상 출력 포함 |
| No Placeholder | TBD, TODO 등 불허 |
| DRY, YAGNI, TDD | 코드 중복 방지, 불필요 기능 제거, 테스트 선행 |
| 빈번한 커밋 | 각 태스크 완료 시 커밋 |
