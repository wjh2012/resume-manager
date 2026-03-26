# Bugfix Batch — 5개 이슈 수정 설계

> 대상 이슈: #87, #63, #64, #61, #40
> 작성일: 2026-03-26

---

## PR 구성

| PR | 이슈 | 브랜치명 | 요약 |
|----|------|----------|------|
| PR 1 | #87 | fix/toctou-document-service | TOCTOU 패턴 수정 |
| PR 2 | #63 #64 #61 | refactor/admin-improvements | Admin 영역 통합 개선 |
| PR 3 | #40 | fix/skeleton-fallback-consistency | Skeleton fallback 일관성 |

---

## PR 1: TOCTOU Pattern Fix (#87)

### 문제

`findUnique`로 소유권 확인 후 별도 `update`/`delete` 호출하는 TOCTOU 패턴.
두 쿼리 사이에 문서가 삭제되면 Prisma P2025 에러가 500으로 노출됨.

### 대상 파일

- `lib/documents/service.ts` — `deleteDocument`
- `lib/external-documents/service.ts` — `updateExternalDocument`, `deleteExternalDocument`

### 설계

#### deleteDocument, deleteExternalDocument

순서를 변경하여 원자적 소유권 확인 + 삭제를 수행한다.

```
findUnique({ where: { id } })       → URL 획득 (소유권 확인 안 함)
delete({ where: { id, userId } })   → 소유권 확인 + 삭제 원자적
  성공 → storage 삭제
  P2025 → NotFoundError throw
```

핵심 변경:
- `where` 조건에 `userId`를 포함하여 단일 쿼리로 소유권 확인과 삭제를 동시 수행
- storage 삭제는 DB 삭제 성공 후에만 실행 (타 사용자 파일 삭제 방지)
- 403/404 통합: "문서가 없음"과 "다른 사용자의 문서" 모두 NotFoundError로 처리 (타 사용자 문서 존재 여부 비노출 — 보안 이점)

#### updateExternalDocument

`source` 필드 검증 등 비즈니스 로직이 findUnique 결과에 의존하므로
`$transaction`으로 findUnique + update를 래핑한다.

```typescript
await prisma.$transaction(async (tx) => {
  const doc = await tx.externalDocument.findUnique({ where: { id, userId } })
  if (!doc) throw new ExternalDocumentNotFoundError()
  // source 검증 등 비즈니스 로직
  return tx.externalDocument.update({ where: { id }, data: { ... } })
})
```

delete와 동일하게 `where: { id, userId }`로 조회하므로 403/404 통합 정책 적용.
"문서가 없음"과 "다른 사용자의 문서" 모두 NotFoundError로 처리.

---

## PR 2: Admin 영역 통합 개선 (#63, #64, #61)

### #63 — user 쿼리 중복 제거

#### 문제

`app/(dashboard)/layout.tsx`에서 `prisma.user.findUnique`로 role을 조회하고,
`/admin/*` 경로에서 `requireAdmin()`이 동일 user를 재조회. RSC 렌더 내 요청당 2회 쿼리.

#### 설계

`React.cache()`로 user role 조회 함수를 래핑한다.

```typescript
// lib/auth/get-user-role.ts (신규)
import { cache } from "react"

export const getUserRole = cache(async (userId: string) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return dbUser?.role ?? "USER"
})
```

- `layout.tsx`와 `requireAdmin()` 양쪽에서 `getUserRole()` 호출
- `React.cache()`는 RSC 렌더 패스 내에서만 중복 제거 — API route handler에서의 호출은 별도 요청이므로 영향 없음

### #64 — Admin UI 4가지 개선

| 항목 | 파일 | 수정 내용 |
|------|------|----------|
| alert→toast | `components/admin/quota-table.tsx` | 삭제 실패 시 `alert()` → `toast.error()` |
| dialog reset | `components/admin/pricing-table.tsx` | uncontrolled form이므로 Dialog에 `key` prop 사용하여 닫힐 때 DOM 리셋 |
| 타입 중복 | `types/admin.ts` (신규) | `PricingEntry`, `QuotaEntry` 추출. 4개 파일에서 import로 교체 |
| UserInfo.role | 해당 타입 정의 위치 | `role?: string` → `role: "ADMIN" \| "USER"` 리터럴 타입 |

타입 중복 현황:
- `PricingEntry`: `pricing-table.tsx` + `admin/model-pricing/page.tsx` (동일 정의 2곳)
- `QuotaEntry`: `quota-table.tsx` + `admin/quotas/page.tsx` (동일 정의 2곳)

### #61 — Quota 수정 Dialog

#### 설계

`quota-table.tsx`에 편집 Dialog를 추가한다.

- 기존 생성 Dialog 패턴(uncontrolled FormData)을 그대로 따름
- 수정 가능 필드: `limitValue`, `isActive`
- 기존 PUT `/api/admin/quotas/[id]` API 활용
- 테이블 행에 편집 버튼 추가 → Dialog 열기 → 기존 값 prefill → PUT 요청

---

## PR 3: Skeleton Fallback 일관성 (#40)

### 문제

일부 페이지에서 `<Suspense>` fallback이 텍스트(`불러오는 중...`)이거나 누락됨.

### 대상 파일 및 수정

| 파일 | 현재 | 수정 |
|------|------|------|
| `app/(dashboard)/resumes/page.tsx` | `<p>불러오는 중...</p>` | 해당 페이지 `loading.tsx`의 Skeleton 재사용 |
| `app/(dashboard)/insights/page.tsx` | `<p>불러오는 중...</p>` | 동일 |
| `app/(auth)/login/page.tsx` | `<Suspense>` (fallback 없음) | 로그인 폼 영역 크기의 Skeleton fallback 추가 |

### 범위 제한

- `loading.tsx`↔Suspense 간 역할 분리(깜빡임 방지)는 이번 범위에서 제외
- 텍스트 fallback → Skeleton 교체 + 누락 fallback 추가만 수행
