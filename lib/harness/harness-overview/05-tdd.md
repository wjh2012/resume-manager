# TDD: 테스트 주도 개발의 철칙

## 개요

`test-driven-development` 스킬은 모든 기능 구현과 버그 수정에서 **테스트를 먼저 작성**하도록 강제한다. Rigid 유형 스킬로, 정확히 따라야 하며 재량 적용이 불가능하다.

## Iron Law (철칙)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
(실패하는 테스트 없이 프로덕션 코드 없음)
```

**위반 시 대응이 극단적이다:**

```
테스트 전에 코드를 작성했다면? 삭제. 다시 시작.

예외 없음:
- "참고용"으로 보관하지 마라
- 테스트 작성하며 "적용"하지 마라
- 보지 마라
- 삭제는 삭제를 의미한다
```

## 적용 범위

**항상 적용:**
- 새 기능
- 버그 수정
- 리팩토링
- 행동 변경

**예외 (사용자 허가 필요):**
- 일회용 프로토타입
- 생성된 코드
- 설정 파일

## RED-GREEN-REFACTOR 사이클

### RED — 실패하는 테스트 작성

```
요구사항:
- 하나의 행동만
- 명확한 이름
- 실제 코드 사용 (mock 최소화)
```

```typescript
// ✅ GOOD
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});

// ❌ BAD: 모호한 이름, mock 행동 테스트
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```

### Verify RED — 실패 확인 (필수, 건너뛰기 불가)

```bash
npm test path/to/test.test.ts
```

확인 사항:
- 테스트가 **에러(error)가 아니라 실패(fail)** 하는가?
- 실패 메시지가 **예상한 것**인가?
- **기능 누락**으로 실패하는가? (오타가 아닌)
- 테스트가 **통과**하면? → 기존 행동을 테스트하고 있는 것. 테스트 수정.

### GREEN — 최소한의 코드

테스트를 통과시키는 **가장 간단한** 코드만 작성한다.

```typescript
// ✅ GOOD: 테스트 통과에 필요한 최소한
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); }
    catch (e) { if (i === 2) throw e; }
  }
  throw new Error('unreachable');
}

// ❌ BAD: 과잉 엔지니어링 (YAGNI)
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; backoff?: 'linear' | 'exponential'; }
): Promise<T> { /* ... */ }
```

### Verify GREEN — 통과 확인 (필수)

- 테스트 통과?
- 다른 테스트도 통과?
- 출력 깨끗? (에러, 경고 없음)
- **테스트 실패 시**: 코드 수정 (테스트 수정이 아님!)
- **다른 테스트 실패 시**: 지금 수정

### REFACTOR — 정리

GREEN 이후에만:
- 중복 제거
- 이름 개선
- 헬퍼 추출
- **테스트 green 유지**
- **행동 추가 금지**

## 합리화 방지 (13개 Red Flag)

| 핑계 | 현실 |
|------|------|
| "테스트하기엔 너무 간단" | 간단한 코드도 깨짐. 30초 걸림 |
| "나중에 테스트" | 즉시 통과하는 테스트는 아무것도 증명 안 함 |
| "후 테스트가 같은 목표 달성" | 후 테스트 = "이게 뭘 하나?" / 선 테스트 = "이게 뭘 해야 하나?" |
| "이미 수동 테스트 완료" | 수동은 ad-hoc. 기록 없음. 재실행 불가 |
| "X시간 작업 삭제는 낭비" | 매몰비용 오류. 신뢰 못할 코드가 기술 부채 |
| "참고로 보관, 테스트 먼저" | 적용할 것이다. 그게 tests-after |
| "탐색이 필요해" | 탐색 OK. 결과물 버리고 TDD로 시작 |
| "테스트 어려움 = 설계 불명확" | 테스트하기 어려움 = 사용하기 어려움. 인터페이스 단순화 |
| "TDD가 느리게 한다" | TDD가 디버깅보다 빠름. 실용적 = test-first |
| "수동 테스트가 더 빠름" | 수동은 엣지 케이스 증명 안 함. 매번 재테스트 필요 |
| "기존 코드에 테스트 없음" | 개선 중. 기존 코드에도 테스트 추가 |
| "TDD가 교조적, 실용적이어야" | TDD가 실용적. 커밋 전 버그 발견이 프로덕션 디버깅보다 빠름 |
| "정신이 아니라 의식" | 의식을 위반하는 것이 정신을 위반하는 것 |

## 순서가 중요한 이유

### "나중에 테스트로 검증하겠다"
후 테스트는 즉시 통과한다. 즉시 통과하면 아무것도 증명하지 못한다:
- 잘못된 것을 테스트할 수 있음
- 구현이 아닌 행동을 테스트할 수 있음
- 잊은 엣지 케이스를 놓칠 수 있음
- 버그를 잡는 것을 본 적이 없음

### "X시간 작업 삭제는 낭비"
매몰비용 오류. 시간은 이미 갔다. 선택:
- 삭제하고 TDD로 재작성 (X시간 더, 높은 신뢰)
- 유지하고 후 테스트 추가 (30분, 낮은 신뢰, 버그 가능)

## 디버깅 연동

버그 발견 시:
1. 버그를 재현하는 실패하는 테스트 작성
2. TDD 사이클 따르기
3. 테스트가 수정을 증명하고 회귀를 방지

**테스트 없이 버그 수정 금지.**

## 검증 체크리스트

작업 완료 표시 전:

```
- [ ] 모든 새 함수/메서드에 테스트 있음
- [ ] 각 테스트가 구현 전에 실패하는 것을 확인
- [ ] 각 테스트가 예상 이유로 실패 (기능 부재, 오타 아님)
- [ ] 각 테스트 통과에 최소 코드만 작성
- [ ] 모든 테스트 통과
- [ ] 출력 깨끗 (에러, 경고 없음)
- [ ] 실제 코드 사용 (mock은 불가피한 경우만)
- [ ] 엣지 케이스와 에러 커버
```

**전부 체크 못하면? TDD를 건너뛴 것. 다시 시작.**
