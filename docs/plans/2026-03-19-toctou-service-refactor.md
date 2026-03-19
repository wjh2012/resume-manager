# TOCTOU 서비스 레이어 리팩토링 설계

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `updateMany/deleteMany → findUnique` 패턴을 `$transaction + findUnique-first + update/delete`로 교체해 TOCTOU 경쟁 조건 제거

**Architecture:** 각 함수를 Prisma `$transaction`으로 감싸고, 트랜잭션 내부에서 레코드 존재·소유권을 먼저 확인한 뒤 단건 `update`/`delete`를 실행. 에러 분기 로직은 동일하게 유지.

**Tech Stack:** Prisma ORM, Vitest

---

## 배경

기존 패턴의 문제:

```ts
// 두 쿼리 사이에 다른 프로세스가 레코드를 삭제/변경할 수 있음
const result = await prisma.model.updateMany({ where: { id, userId }, data })
if (result.count === 0) {
  const exists = await prisma.model.findUnique({ where: { id } }) // TOCTOU
  if (!exists) throw new NotFoundError()
  throw new ForbiddenError()
}
```

교체 패턴:

```ts
return prisma.$transaction(async (tx) => {
  const record = await tx.model.findUnique({ where: { id } })
  if (!record) throw new NotFoundError()
  if (record.userId !== userId) throw new ForbiddenError()
  return tx.model.update({ where: { id }, data })
})
```

## 대상 범위

| 파일 | 함수 |
|------|------|
| `lib/cover-letters/service.ts` | `updateCoverLetter` |
| `lib/cover-letters/service.ts` | `deleteCoverLetter` |
| `lib/interviews/service.ts` | `completeInterview` |
| `lib/interviews/service.ts` | `deleteInterview` |

**범위 외:** `updateSelectedDocuments`의 `deleteMany`는 cascade 삭제용으로 소유권 분기 없음 — 수정 안 함.

---

## Task 1: cover-letters 서비스 리팩토링

**Files:**
- Modify: `lib/cover-letters/service.ts`
- Test: `tests/lib/cover-letters/service.test.ts`

- [ ] **Step 1: 테스트 먼저 수정** — `updateCoverLetter` mock을 `$transaction + findUnique + update` 패턴으로 변경

- [ ] **Step 2: 실패 확인** — `npx vitest run tests/lib/cover-letters/service.test.ts`

- [ ] **Step 3: `updateCoverLetter` 구현 변경**

```ts
export async function updateCoverLetter(id: string, userId: string, data: UpdateCoverLetterData) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.coverLetter.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new CoverLetterNotFoundError()
    if (record.userId !== userId) throw new CoverLetterForbiddenError()
    return tx.coverLetter.update({
      where: { id },
      data,
      select: { id: true, title: true, content: true, status: true, updatedAt: true },
    })
  })
}
```

- [ ] **Step 4: 테스트 먼저 수정** — `deleteCoverLetter` mock을 `$transaction + findUnique + delete` 패턴으로 변경

- [ ] **Step 5: `deleteCoverLetter` 구현 변경**

```ts
export async function deleteCoverLetter(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.coverLetter.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new CoverLetterNotFoundError()
    if (record.userId !== userId) throw new CoverLetterForbiddenError()
    await tx.coverLetter.delete({ where: { id } })
  })
}
```

- [ ] **Step 6: 통과 확인** — `npx vitest run tests/lib/cover-letters/service.test.ts`

- [ ] **Step 7: 커밋**

```bash
git add lib/cover-letters/service.ts tests/lib/cover-letters/service.test.ts
git commit -m "refactor(cover-letters): replace TOCTOU pattern with transaction-first"
```

---

## Task 2: interviews 서비스 리팩토링

**Files:**
- Modify: `lib/interviews/service.ts`
- Test: `tests/lib/interviews/service.test.ts`

- [ ] **Step 1: 테스트 먼저 수정** — `completeInterview` mock을 `$transaction + findUnique + update` 패턴으로 변경

- [ ] **Step 2: `completeInterview` 구현 변경**

```ts
export async function completeInterview(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.interviewSession.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new InterviewNotFoundError()
    if (record.userId !== userId) throw new InterviewForbiddenError()
    return tx.interviewSession.update({
      where: { id },
      data: { status: "COMPLETED" },
      select: { id: true, status: true, updatedAt: true },
    })
  })
}
```

- [ ] **Step 3: 테스트 먼저 수정** — `deleteInterview` mock을 `$transaction + findUnique + delete` 패턴으로 변경

- [ ] **Step 4: `deleteInterview` 구현 변경**

```ts
export async function deleteInterview(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.interviewSession.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new InterviewNotFoundError()
    if (record.userId !== userId) throw new InterviewForbiddenError()
    await tx.interviewSession.delete({ where: { id } })
  })
}
```

- [ ] **Step 5: 통과 확인** — `npx vitest run tests/lib/interviews/service.test.ts`

- [ ] **Step 6: 커밋**

```bash
git add lib/interviews/service.ts tests/lib/interviews/service.test.ts
git commit -m "refactor(interviews): replace TOCTOU pattern with transaction-first"
```

---

## Task 3: 전체 테스트 및 마무리

- [ ] **Step 1: 전체 테스트** — `npx vitest run`

- [ ] **Step 2: 타입 체크** — `npm run typecheck`

- [ ] **Step 3: 린트** — `npm run lint`

- [ ] **Step 4: PR 생성** — base: `develop`
