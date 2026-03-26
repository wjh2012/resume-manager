# Bugfix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 open issues (#87, #63, #64, #61, #40) across 3 PRs.

**Architecture:** PR 1 fixes TOCTOU race conditions in document services using `deleteMany` with compound where + P2025 catch. PR 2 consolidates admin improvements: `React.cache()` for query dedup, UI fixes, shared types, and a quota edit dialog. PR 3 replaces text loading fallbacks with Skeleton components.

**Tech Stack:** Next.js App Router, Prisma ORM, React Server Components, shadcn/ui, Vitest

---

## PR 1: TOCTOU Pattern Fix (#87)

Branch: `fix/toctou-document-service`

### Task 1: Update deleteDocument tests for new behavior

**Files:**
- Modify: `tests/lib/documents/service.test.ts`

**Context:** The current `deleteDocument` uses separate findUnique (ownership check) + delete (removal). We're changing to: findUnique (URL only) → deleteMany({ where: { id, userId } }) → storage delete on success. The Prisma `delete` only accepts unique fields in `where`, but `deleteMany` accepts any field combination. 403/404 are unified — both become NotFoundError.

- [ ] **Step 1: Update the mock setup to include deleteMany**

In the prisma mock at the top of the file, add `deleteMany`:

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))
```

- [ ] **Step 2: Rewrite deleteDocument tests**

Replace the entire `describe("deleteDocument()")` block with:

```typescript
describe("deleteDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)
  })

  describe("소유권 검증 (403/404 통합)", () => {
    it("문서가 존재하지 않으면 DocumentNotFoundError를 던져야 한다", async () => {
      // Arrange — deleteMany가 0 rows 영향
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: "storage/user-1/doc.pdf",
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 } as never)

      // Act & Assert
      await expect(deleteDocument("doc-999", "user-1")).rejects.toThrow(
        DocumentNotFoundError,
      )
    })

    it("userId가 문서 소유자와 달라도 DocumentNotFoundError를 던져야 한다 (403/404 통합)", async () => {
      // Arrange — findUnique는 문서를 찾지만, deleteMany에서 userId 불일치로 count: 0
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: "storage/owner-user/doc.pdf",
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 } as never)

      // Act & Assert
      await expect(deleteDocument("doc-1", "other-user")).rejects.toThrow(
        DocumentNotFoundError,
      )
      // Storage 삭제가 호출되지 않아야 한다
      expect(mockDeleteFile).not.toHaveBeenCalled()
    })
  })

  describe("성공 경로", () => {
    it("DB 삭제 후 Storage 파일을 삭제해야 한다", async () => {
      // Arrange
      const storagePath = "storage/user-1/resume.pdf"
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: storagePath,
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)

      // Act
      await deleteDocument("doc-1", "user-1")

      // Assert — deleteMany에 userId 조건이 포함되어야 한다
      expect(mockPrisma.document.deleteMany).toHaveBeenCalledWith({
        where: { id: "doc-1", userId: "user-1" },
      })
      // Storage 삭제는 DB 삭제 성공 후에만
      expect(mockDeleteFile).toHaveBeenCalledWith(storagePath)
    })

    it("deleteFile이 실패해도 에러를 던지지 않아야 한다 (catch 무시)", async () => {
      // Arrange
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: "storage/user-1/resume.pdf",
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)
      mockDeleteFile.mockRejectedValue(new Error("Storage 오류"))

      // Act — 에러 없이 완료
      await expect(deleteDocument("doc-1", "user-1")).resolves.toBeUndefined()
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/documents/service.test.ts`
Expected: FAIL — deleteDocument still uses old findUnique+delete pattern

### Task 2: Implement deleteDocument fix

**Files:**
- Modify: `lib/documents/service.ts:113-138`

- [ ] **Step 1: Rewrite deleteDocument**

Replace the `deleteDocument` function with:

```typescript
// 문서 삭제: URL 획득 → 원자적 소유권 검증+삭제 → Storage 정리
export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  // URL 획득 (소유권 확인 안 함)
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { originalUrl: true },
  })

  // 원자적 소유권 확인 + 삭제
  const { count } = await prisma.document.deleteMany({
    where: { id: documentId, userId },
  })

  if (count === 0) {
    throw new DocumentNotFoundError()
  }

  // DB 삭제 성공 후에만 Storage 정리
  if (document?.originalUrl) {
    await deleteFile(document.originalUrl).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/lib/documents/service.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add lib/documents/service.ts tests/lib/documents/service.test.ts
git commit -m "fix: deleteDocument TOCTOU 패턴 수정 — deleteMany로 원자적 소유권 검증

findUnique+delete 분리 패턴을 deleteMany({ id, userId })로 변경하여
race condition 제거. Storage 삭제는 DB 삭제 성공 후에만 실행.
403/404 통합으로 타 사용자 문서 존재 여부 비노출.

Closes #87 (partial)"
```

### Task 3: Update deleteExternalDocument tests

**Files:**
- Modify: `tests/lib/external-documents/service.test.ts`

- [ ] **Step 1: Update the mock setup to include deleteMany**

In the prisma mock at the top of the file, add `deleteMany`:

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    externalDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))
```

- [ ] **Step 2: Rewrite deleteExternalDocument tests**

Replace the entire `describe("deleteExternalDocument()")` block with:

```typescript
describe("deleteExternalDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)
  })

  it("deleteMany가 count: 0을 반환하면 ExternalDocumentNotFoundError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/doc.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 0 } as never)

    // Act & Assert
    await expect(deleteExternalDocument("ext-doc-999", "user-1")).rejects.toThrow(
      ExternalDocumentNotFoundError,
    )
    await expect(deleteExternalDocument("ext-doc-999", "user-1")).rejects.toThrow(
      "외부 문서를 찾을 수 없습니다.",
    )
  })

  it("userId가 문서 소유자와 달라도 ExternalDocumentNotFoundError를 던져야 한다 (403/404 통합)", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/owner-user/doc.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 0 } as never)

    // Act & Assert
    await expect(deleteExternalDocument("ext-doc-1", "other-user")).rejects.toThrow(
      ExternalDocumentNotFoundError,
    )
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it("DB 삭제 후 Storage 파일을 삭제해야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/job-posting.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)

    // Act
    await deleteExternalDocument("ext-doc-1", "user-1")

    // Assert
    expect(mockPrisma.externalDocument.deleteMany).toHaveBeenCalledWith({
      where: { id: "ext-doc-1", userId: "user-1" },
    })
    expect(mockDeleteFile).toHaveBeenCalledWith("storage/user-1/job-posting.pdf")
  })

  it("originalUrl이 없으면 Storage 삭제를 건너뛰어야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: null,
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)

    // Act
    await deleteExternalDocument("ext-doc-1", "user-1")

    // Assert
    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockPrisma.externalDocument.deleteMany).toHaveBeenCalledWith({
      where: { id: "ext-doc-1", userId: "user-1" },
    })
  })

  it("deleteFile이 실패해도 에러를 던지지 않아야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/job-posting.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)
    mockDeleteFile.mockRejectedValue(new Error("Storage 오류"))

    // Act
    await expect(deleteExternalDocument("ext-doc-1", "user-1")).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: FAIL

### Task 4: Implement deleteExternalDocument fix

**Files:**
- Modify: `lib/external-documents/service.ts:241-269`

- [ ] **Step 1: Rewrite deleteExternalDocument**

Replace the `deleteExternalDocument` function with:

```typescript
// 외부 문서 삭제
export async function deleteExternalDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  // URL 획득 (소유권 확인 안 함)
  const document = await prisma.externalDocument.findUnique({
    where: { id: documentId },
    select: { originalUrl: true },
  })

  // 원자적 소유권 확인 + 삭제
  const { count } = await prisma.externalDocument.deleteMany({
    where: { id: documentId, userId },
  })

  if (count === 0) {
    throw new ExternalDocumentNotFoundError()
  }

  // DB 삭제 성공 후에만 Storage 정리
  if (document?.originalUrl) {
    await deleteFile(document.originalUrl).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add lib/external-documents/service.ts tests/lib/external-documents/service.test.ts
git commit -m "fix: deleteExternalDocument TOCTOU 패턴 수정 — deleteMany로 원자적 소유권 검증"
```

### Task 5: Update updateExternalDocument tests for $transaction

**Files:**
- Modify: `tests/lib/external-documents/service.test.ts`

**Context:** `updateExternalDocument` needs a `$transaction` wrapper because it reads `sourceType` before updating. The mock must include `$transaction` that executes the callback with a transaction client.

- [ ] **Step 1: Add $transaction to the prisma mock**

Update the mock at the top of the file:

```typescript
vi.mock("@/lib/prisma", () => {
  const externalDocument = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  }
  return {
    prisma: {
      externalDocument,
      $transaction: vi.fn((fn: (tx: { externalDocument: typeof externalDocument }) => Promise<unknown>) =>
        fn({ externalDocument }),
      ),
    },
  }
})
```

- [ ] **Step 2: Update updateExternalDocument tests for $transaction + 403/404 통합**

Replace the `describe("updateExternalDocument()")` block. The key change: findUnique now uses `{ where: { id, userId } }` inside the transaction, so a non-owner gets NotFoundError instead of ForbiddenError:

```typescript
describe("updateExternalDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.externalDocument.update.mockResolvedValue({
      id: "ext-doc-1",
      title: "수정된 제목",
      category: "채용공고",
      sourceType: "text",
    } as never)
  })

  it("텍스트 문서의 제목과 내용을 수정할 수 있어야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-1",
      userId: "user-1",
      sourceType: "text",
    } as never)

    // Act
    const result = await updateExternalDocument("ext-doc-1", "user-1", {
      title: "수정된 제목",
      content: "수정된 내용",
    })

    // Assert
    expect(mockPrisma.externalDocument.findUnique).toHaveBeenCalledWith({
      where: { id: "ext-doc-1", userId: "user-1" },
      select: { id: true, sourceType: true },
    })
    expect(mockPrisma.externalDocument.update).toHaveBeenCalledWith({
      where: { id: "ext-doc-1" },
      data: { title: "수정된 제목", content: "수정된 내용" },
      select: { id: true, title: true, category: true, sourceType: true },
    })
    expect(result).toMatchObject({ id: "ext-doc-1", title: "수정된 제목" })
  })

  it("파일 문서에서 content 수정 시도 시 ExternalDocumentValidationError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-2",
      userId: "user-1",
      sourceType: "file",
    } as never)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-2", "user-1", { content: "수정 시도" }),
    ).rejects.toThrow(ExternalDocumentValidationError)
    await expect(
      updateExternalDocument("ext-doc-2", "user-1", { content: "수정 시도" }),
    ).rejects.toThrow("파일 문서의 내용은 수정할 수 없습니다.")
  })

  it("문서가 존재하지 않으면 ExternalDocumentNotFoundError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-999", "user-1", { title: "수정" }),
    ).rejects.toThrow(ExternalDocumentNotFoundError)
  })

  it("소유자가 다르면 ExternalDocumentNotFoundError를 던져야 한다 (403/404 통합)", async () => {
    // Arrange — where: { id, userId } 불일치로 null 반환
    mockPrisma.externalDocument.findUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-1", "other-user", { title: "수정" }),
    ).rejects.toThrow(ExternalDocumentNotFoundError)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: FAIL — updateExternalDocument still uses old pattern without $transaction

### Task 6: Implement updateExternalDocument fix

**Files:**
- Modify: `lib/external-documents/service.ts:203-239`

- [ ] **Step 1: Rewrite updateExternalDocument**

Replace the `updateExternalDocument` function with:

```typescript
// 외부 문서 수정
export async function updateExternalDocument(
  documentId: string,
  userId: string,
  data: { title?: string; category?: string; content?: string },
) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.externalDocument.findUnique({
      where: { id: documentId, userId },
      select: { id: true, sourceType: true },
    })

    if (!document) {
      throw new ExternalDocumentNotFoundError()
    }

    // 파일 문서에서 content 수정 시도 차단
    if (document.sourceType === "file" && data.content !== undefined) {
      throw new ExternalDocumentValidationError(
        "파일 문서의 내용은 수정할 수 없습니다.",
      )
    }

    const updateData: Record<string, string> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.category !== undefined) updateData.category = data.category
    if (data.content !== undefined) updateData.content = data.content

    return tx.externalDocument.update({
      where: { id: documentId },
      data: updateData,
      select: { id: true, title: true, category: true, sourceType: true },
    })
  })
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Remove unused error classes**

In `lib/documents/service.ts`, remove `DocumentForbiddenError` (no longer thrown).
In `lib/external-documents/service.ts`, remove `ExternalDocumentForbiddenError` (no longer thrown).

Check for usages first:

Run: `grep -r "DocumentForbiddenError\|ExternalDocumentForbiddenError" --include="*.ts" --include="*.tsx" lib/ app/ tests/ components/`

Remove from source files and test imports if no other references exist. If there are references in API route handlers, update them accordingly.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run tests/lib/documents/service.test.ts tests/lib/external-documents/service.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/external-documents/service.ts lib/documents/service.ts tests/lib/external-documents/service.test.ts tests/lib/documents/service.test.ts
git commit -m "fix: updateExternalDocument $transaction 래핑 + unused ForbiddenError 제거

Closes #87"
```

---

## PR 2: Admin 영역 통합 개선 (#63, #64, #61)

Branch: `refactor/admin-improvements`

### Task 7: Extract shared admin types (#64 타입 중복)

**Files:**
- Create: `types/admin.ts`
- Modify: `components/admin/quota-table.tsx:33-41`
- Modify: `components/admin/pricing-table.tsx:33-40`
- Modify: `app/(dashboard)/admin/quotas/page.tsx:6-14`
- Modify: `app/(dashboard)/admin/model-pricing/page.tsx:6-13`

- [ ] **Step 1: Create types/admin.ts**

```typescript
export interface QuotaEntry {
  id: string
  userId: string
  limitType: string
  limitValue: number
  period: string
  isActive: boolean
  user: { email: string; name: string | null }
}

export interface PricingEntry {
  id: string
  provider: string
  model: string
  inputPricePerM: number
  outputPricePerM: number
  effectiveFrom: string
}
```

- [ ] **Step 2: Replace inline interfaces in all 4 files**

In `components/admin/quota-table.tsx`, remove the `QuotaEntry` interface (lines 33-41) and add import:
```typescript
import type { QuotaEntry } from "@/types/admin"
```

In `components/admin/pricing-table.tsx`, remove the `PricingEntry` interface (lines 33-40) and add import:
```typescript
import type { PricingEntry } from "@/types/admin"
```

In `app/(dashboard)/admin/quotas/page.tsx`, remove the `QuotaEntry` interface (lines 6-14) and add import:
```typescript
import type { QuotaEntry } from "@/types/admin"
```

In `app/(dashboard)/admin/model-pricing/page.tsx`, remove the `PricingEntry` interface (lines 6-13) and add import:
```typescript
import type { PricingEntry } from "@/types/admin"
```

- [ ] **Step 3: Commit**

```bash
git add types/admin.ts components/admin/quota-table.tsx components/admin/pricing-table.tsx app/\(dashboard\)/admin/quotas/page.tsx app/\(dashboard\)/admin/model-pricing/page.tsx
git commit -m "refactor: PricingEntry, QuotaEntry를 types/admin.ts로 추출하여 중복 제거"
```

### Task 8: Fix UserInfo.role type (#64)

**Files:**
- Modify: `lib/supabase/user.ts:5-10`

- [ ] **Step 1: Change role type**

In `lib/supabase/user.ts`, change line 9:

```typescript
// Before
role?: string

// After
role?: "ADMIN" | "USER"
```

- [ ] **Step 2: Check for type errors propagated by this change**

Run: `npx tsc --noEmit 2>&1 | head -30`

If type errors appear in files that assign a plain `string` to `role`, update those call sites. The main call site is `app/(dashboard)/layout.tsx:23`:

```typescript
// Before
const userInfo = { ...extractUserInfo(user), role: dbUser?.role ?? "USER" }

// After — dbUser.role is already string from Prisma, needs assertion
const userInfo = { ...extractUserInfo(user), role: (dbUser?.role ?? "USER") as "ADMIN" | "USER" }
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/user.ts app/\(dashboard\)/layout.tsx
git commit -m "refactor: UserInfo.role을 'ADMIN' | 'USER' 리터럴 타입으로 변경"
```

### Task 9: Fix alert → toast in quota-table (#64)

**Files:**
- Modify: `components/admin/quota-table.tsx:108`

- [ ] **Step 1: Add toast import and replace alert**

Add import at the top of `components/admin/quota-table.tsx`:

```typescript
import { toast } from "sonner"
```

Replace line 108:

```typescript
// Before
alert(err instanceof Error ? err.message : "삭제에 실패했습니다.")

// After
toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.")
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/quota-table.tsx
git commit -m "fix: quota 삭제 실패 시 alert() → toast.error()로 교체"
```

### Task 10: Fix Dialog reset in pricing-table (#64)

**Files:**
- Modify: `components/admin/pricing-table.tsx`

**Context:** The form is uncontrolled (uses `FormData`). When the dialog closes and reopens, previous input values persist in the DOM. Using a `key` prop that changes when `open` changes forces React to remount the DialogContent, resetting all form fields.

- [ ] **Step 1: Add key prop to force remount on reopen**

In `components/admin/pricing-table.tsx`, add `key` to the `DialogContent` component (around line 96):

```tsx
// Before
<DialogContent>

// After
<DialogContent key={String(open)}>
```

Also reset the `error` state when dialog opens. In the `onOpenChange` handler, update the Dialog:

```tsx
// Before
<Dialog open={open} onOpenChange={setOpen}>

// After
<Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
```

- [ ] **Step 2: Apply the same fix to quota-table create dialog**

In `components/admin/quota-table.tsx`, apply the same pattern to the create dialog (around line 118):

```tsx
// Before
<Dialog open={open} onOpenChange={setOpen}>

// After
<Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
```

Add `key` to the `DialogContent` (around line 125):

```tsx
// Before
<DialogContent>

// After
<DialogContent key={String(open)}>
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/pricing-table.tsx components/admin/quota-table.tsx
git commit -m "fix: admin Dialog 재열기 시 이전 입력값/에러 잔류 수정 — key prop으로 DOM 리셋"
```

### Task 11: Create getUserRole with React.cache (#63)

**Files:**
- Create: `lib/auth/get-user-role.ts`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `lib/auth/require-admin.ts`

- [ ] **Step 1: Create lib/auth/get-user-role.ts**

```typescript
import { cache } from "react"
import { prisma } from "@/lib/prisma"

/**
 * React.cache()로 래핑된 user role 조회.
 * 같은 RSC 렌더 패스 내에서 여러 번 호출해도 실제 DB 쿼리는 1회만 실행.
 */
export const getUserRole = cache(async (userId: string): Promise<"ADMIN" | "USER"> => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return (dbUser?.role ?? "USER") as "ADMIN" | "USER"
})
```

- [ ] **Step 2: Update app/(dashboard)/layout.tsx**

```typescript
// Remove prisma import, add getUserRole import
import { getUserRole } from "@/lib/auth/get-user-role"

// Replace lines 19-23:
// Before
const dbUser = await prisma.user.findUnique({
  where: { id: user.id },
  select: { role: true },
})
const userInfo = { ...extractUserInfo(user), role: dbUser?.role ?? "USER" }

// After
const role = await getUserRole(user.id)
const userInfo = { ...extractUserInfo(user), role }
```

Also remove `import { prisma } from "@/lib/prisma"` since it's no longer used directly.

- [ ] **Step 3: Update lib/auth/require-admin.ts**

```typescript
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

type AdminResult =
  | { ok: true; user: { id: string; role: string } }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 }

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401 }

  const role = await getUserRole(user.id)

  if (role !== "ADMIN") return { ok: false, status: 403 }

  return { ok: true, user: { id: user.id, role } }
}
```

- [ ] **Step 4: Update require-admin.test.ts mock**

In `tests/lib/auth/require-admin.test.ts`, replace the prisma mock with a getUserRole mock:

```typescript
// Replace prisma mock with:
vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(),
}))

import { getUserRole } from "@/lib/auth/get-user-role"
const mockGetUserRole = vi.mocked(getUserRole)
```

Update test arrangements to use `mockGetUserRole.mockResolvedValue("ADMIN")` / `mockGetUserRole.mockResolvedValue("USER")` instead of `mockPrisma.user.findUnique(...)`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/auth/require-admin.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add lib/auth/get-user-role.ts app/\(dashboard\)/layout.tsx lib/auth/require-admin.ts tests/lib/auth/require-admin.test.ts
git commit -m "perf: React.cache()로 user role 조회 중복 제거

layout.tsx와 requireAdmin()이 동일 user를 각각 조회하던 것을
getUserRole()으로 통합. RSC 렌더 내 한 번만 DB 쿼리.

Closes #63"
```

### Task 12: Add Quota edit dialog (#61)

**Files:**
- Modify: `components/admin/quota-table.tsx`

**Context:** The existing create dialog uses uncontrolled form with `FormData`. The edit dialog follows the same pattern. The PUT `/api/admin/quotas/[id]` API accepts `{ limitValue?, isActive? }`.

- [ ] **Step 1: Add edit dialog state and handler**

In `components/admin/quota-table.tsx`, add state and handler inside the `QuotaTable` component, after the existing state declarations:

```typescript
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

// Inside QuotaTable component, after existing state:
const [editTarget, setEditTarget] = useState<QuotaEntry | null>(null)
const [editSubmitting, setEditSubmitting] = useState(false)
const [editError, setEditError] = useState("")

async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  if (!editTarget) return
  setEditSubmitting(true)
  setEditError("")

  const form = new FormData(e.currentTarget)
  const body = {
    limitValue: Number(form.get("limitValue")),
    isActive: form.get("isActive") === "on",
  }

  try {
    const res = await fetch(`/api/admin/quotas/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "수정에 실패했습니다.")
    }
    setEditTarget(null)
    onChanged()
  } catch (err) {
    setEditError(err instanceof Error ? err.message : "오류가 발생했습니다.")
  } finally {
    setEditSubmitting(false)
  }
}
```

- [ ] **Step 2: Add edit button to table rows**

In the table row actions cell (around line 233), add an edit button before the delete button:

```tsx
<TableCell className="flex gap-1">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setEditTarget(quota)}
  >
    <Pencil className="h-4 w-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    disabled={deletingId === quota.id}
    onClick={() => handleDelete(quota.id)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</TableCell>
```

Update the `<TableHead className="w-16" />` to `<TableHead className="w-24" />` to accommodate two buttons.

- [ ] **Step 3: Add edit dialog JSX**

Add the edit dialog after the Card's closing tag, but before the component's return closes. Or add it inside the Card, after `</CardContent>`:

```tsx
<Dialog open={editTarget !== null} onOpenChange={(v) => { if (!v) { setEditTarget(null); setEditError(""); } }}>
  <DialogContent key={editTarget?.id}>
    <DialogHeader>
      <DialogTitle>Quota 수정</DialogTitle>
      <DialogDescription>
        {editTarget?.user.email} — {LIMIT_LABELS[editTarget?.limitType ?? ""] ?? editTarget?.limitType} ({PERIOD_LABELS[editTarget?.period ?? ""] ?? editTarget?.period})
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleEdit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-limitValue">제한 값</Label>
        <Input
          id="edit-limitValue"
          name="limitValue"
          type="number"
          min="1"
          required
          defaultValue={editTarget?.limitValue}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="edit-isActive"
          name="isActive"
          defaultChecked={editTarget?.isActive}
        />
        <Label htmlFor="edit-isActive">활성</Label>
      </div>
      {editError && (
        <p className="text-sm text-destructive">{editError}</p>
      )}
      <Button type="submit" disabled={editSubmitting} className="w-full">
        {editSubmitting ? "수정 중..." : "수정"}
      </Button>
    </form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/quota-table.tsx
git commit -m "feat: admin quota 수정 Dialog 추가 — limitValue, isActive 편집

기존 PUT /api/admin/quotas/[id] API 활용.
생성 Dialog 패턴(uncontrolled FormData)을 그대로 따름.

Closes #61
Closes #64"
```

---

## PR 3: Skeleton Fallback 일관성 (#40)

Branch: `fix/skeleton-fallback-consistency`

### Task 13: Replace text fallback with Skeleton in resumes page

**Files:**
- Modify: `app/(dashboard)/resumes/page.tsx:44`

**Context:** The existing `loading.tsx` renders a full-page skeleton including header + grid. The Suspense fallback only needs the list area skeleton (the header is already rendered outside Suspense). Extract just the list grid skeleton.

- [ ] **Step 1: Replace text fallback with Skeleton**

In `app/(dashboard)/resumes/page.tsx`, add Skeleton import and replace the Suspense fallback:

```typescript
import { Skeleton } from "@/components/ui/skeleton"
```

Replace line 44:

```tsx
// Before
<Suspense fallback={<p className="text-muted-foreground py-12 text-center">불러오는 중...</p>}>

// After
<Suspense
  fallback={
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  }
>
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/resumes/page.tsx
git commit -m "fix: resumes 페이지 Suspense fallback을 Skeleton으로 교체"
```

### Task 14: Replace text fallback with Skeleton in insights page

**Files:**
- Modify: `app/(dashboard)/insights/page.tsx:56-61`

- [ ] **Step 1: Replace text fallback with Skeleton**

Add Skeleton import:

```typescript
import { Skeleton } from "@/components/ui/skeleton"
```

Replace the Suspense fallback:

```tsx
// Before
<Suspense
  fallback={
    <p className="text-muted-foreground py-12 text-center">
      불러오는 중...
    </p>
  }
>

// After
<Suspense
  fallback={
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  }
>
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/insights/page.tsx
git commit -m "fix: insights 페이지 Suspense fallback을 Skeleton으로 교체"
```

### Task 15: Add Skeleton fallback to login page

**Files:**
- Modify: `app/(auth)/login/page.tsx:84-89`

- [ ] **Step 1: Add Skeleton import and fallback**

Add import:

```typescript
import { Skeleton } from "@/components/ui/skeleton"
```

Replace the Suspense wrapper:

```tsx
// Before
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

// After
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="flex w-full max-w-sm flex-col items-center gap-8 px-4">
            <div className="text-center space-y-2">
              <Skeleton className="mx-auto h-8 w-48" />
              <Skeleton className="mx-auto h-5 w-56" />
            </div>
            <div className="flex w-full flex-col gap-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "fix: login 페이지 Suspense에 Skeleton fallback 추가

Closes #40"
```
