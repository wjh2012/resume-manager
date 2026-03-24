# 외부 문서(ExternalDocument) 분리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 개인 문서(Document)와 외부 문서(채용공고, JD 등)를 분리하여 ExternalDocument 모델로 독립 관리하고, 자소서·면접의 AI 채팅에 통합한다.

**Architecture:** ExternalDocument + 조인 테이블 2개를 추가하고, CoverLetter.jobPostingText를 마이그레이션 후 제거한다. 기존 Document 서비스 패턴(CRUD, 에러 클래스, 소유권 검증)을 그대로 따르며, AI 컨텍스트에 외부 문서 요약 섹션과 readExternalDocument 도구를 추가한다.

**Tech Stack:** Next.js App Router, Prisma ORM, PostgreSQL, Zod, AI SDK

**Spec:** `docs/superpowers/specs/2026-03-24-external-document-separation-design.md`

---

## 파일 구조

| 파일 | 작업 | 역할 |
|------|------|------|
| `prisma/schema.prisma` | 수정 | ExternalDocument, CoverLetterExternalDoc, InterviewExternalDoc 모델 추가, CoverLetter.jobPostingText 제거 |
| `lib/validations/external-document.ts` | 생성 | 외부 문서 생성/수정 Zod 스키마 |
| `lib/external-documents/service.ts` | 생성 | CRUD + 소유권 검증 |
| `app/api/external-documents/route.ts` | 생성 | POST (생성) + GET (목록) |
| `app/api/external-documents/[id]/route.ts` | 생성 | GET (단건) + PATCH (수정) + DELETE (삭제) |
| `lib/validations/cover-letter.ts` | 수정 | jobPostingText 제거, selectedExternalDocumentIds 추가 |
| `lib/validations/interview.ts` | 수정 | selectedExternalDocumentIds 추가 |
| `lib/cover-letters/service.ts` | 수정 | jobPostingText 제거, 외부 문서 연결 추가 |
| `lib/interviews/service.ts` | 수정 | 외부 문서 연결 추가 |
| `types/ai.ts` | 수정 | BuildContextOptions에 selectedExternalDocumentIds 추가 |
| `lib/ai/context.ts` | 수정 | 외부 문서 요약 섹션 추가, externalDocumentCount 반환 |
| `lib/ai/tools/read-external-document.ts` | 생성 | readExternalDocument 도구 |
| `lib/ai/tools/index.ts` | 수정 | export + calculateMaxSteps 파라미터 추가 |
| `lib/ai/pipeline/multi-step.ts` | 수정 | MultiStepParams에 externalDocumentCount 추가 |
| `lib/ai/pipeline/classification.ts` | 수정 | 외부 문서 전문 조회 지원, classification 스키마 확장 |
| `lib/ai/prompts/cover-letter.ts` | 수정 | jobPostingText → 외부 문서 섹션 |
| `lib/ai/prompts/interview.ts` | 수정 | 외부 문서 섹션 추가 |
| `app/api/chat/cover-letter/route.ts` | 수정 | jobPostingText 제거, 외부 문서 도구 추가 |
| `app/api/chat/interview/route.ts` | 수정 | 외부 문서 도구 추가 |
| `app/api/cover-letters/route.ts` | 수정 | jobPostingText 제거, selectedExternalDocumentIds 추가 |
| `app/api/cover-letters/[id]/documents/route.ts` | 수정 | 외부 문서 선택 변경 지원 |
| `app/api/interviews/route.ts` | 수정 | selectedExternalDocumentIds 추가 |

> **benchmarks/ 하위 코드는 이번 변경 범위에서 제외** (별도 리팩토링 예정)

---

### Task 1: Prisma 스키마 + 마이그레이션

ExternalDocument 모델과 조인 테이블을 추가하고, jobPostingText 데이터를 마이그레이션한다.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_external_documents/migration.sql` (prisma migrate dev가 자동 생성)

- [ ] **Step 1: schema.prisma에 ExternalDocument 모델 추가**

`Document` 모델 아래에 추가:

```prisma
model ExternalDocument {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  title         String
  category      String   @default("")
  sourceType    String   @map("source_type")
  fileType      String?  @map("file_type")
  originalUrl   String?  @map("original_url")
  fileSize      Int?     @map("file_size")
  content       String   @db.Text
  summary       String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user                    User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  coverLetterExternalDocs CoverLetterExternalDoc[]
  interviewExternalDocs   InterviewExternalDoc[]

  @@map("external_documents")
}

model CoverLetterExternalDoc {
  coverLetterId      String @map("cover_letter_id") @db.Uuid
  externalDocumentId String @map("external_document_id") @db.Uuid

  coverLetter      CoverLetter      @relation(fields: [coverLetterId], references: [id], onDelete: Cascade)
  externalDocument ExternalDocument  @relation(fields: [externalDocumentId], references: [id], onDelete: Cascade)

  @@id([coverLetterId, externalDocumentId])
  @@map("cover_letter_external_docs")
}

model InterviewExternalDoc {
  interviewSessionId String @map("interview_session_id") @db.Uuid
  externalDocumentId String @map("external_document_id") @db.Uuid

  interviewSession InterviewSession @relation(fields: [interviewSessionId], references: [id], onDelete: Cascade)
  externalDocument ExternalDocument  @relation(fields: [externalDocumentId], references: [id], onDelete: Cascade)

  @@id([interviewSessionId, externalDocumentId])
  @@map("interview_external_docs")
}
```

- [ ] **Step 2: 기존 모델에 관계 필드 추가**

`User` 모델에 추가:
```prisma
externalDocuments ExternalDocument[]
```

`CoverLetter` 모델에서 `jobPostingText` 필드 제거하고 추가:
```prisma
coverLetterExternalDocs CoverLetterExternalDoc[]
```

`InterviewSession` 모델에 추가:
```prisma
interviewExternalDocs InterviewExternalDoc[]
```

- [ ] **Step 3: 마이그레이션 생성**

Run: `npx prisma migrate dev --name add_external_documents --create-only`
Expected: `prisma/migrations/<timestamp>_add_external_documents/migration.sql` 파일 생성

- [ ] **Step 4: 마이그레이션 SQL에 데이터 이전 로직 추가**

자동 생성된 SQL의 `ALTER TABLE "cover_letters" DROP COLUMN "job_posting_text"` **앞에** 다음을 삽입.

> **주의**: CoverLetter 1행당 ExternalDocument 1행을 1:1로 생성해야 한다. title/content로 JOIN하면 동일 사용자가 같은 회사에 여러 자소서를 작성한 경우 크로스 조인이 발생한다. CTE + RETURNING으로 1:1 매핑한다.

```sql
-- jobPostingText 데이터를 ExternalDocument로 1:1 이전
-- cover_letter_id를 임시 추적하기 위해 2단계로 처리
DO $$
DECLARE
  r RECORD;
  new_ext_id UUID;
BEGIN
  FOR r IN
    SELECT "id" AS cover_letter_id, "user_id", "company_name", "job_posting_text"
    FROM "cover_letters"
    WHERE "job_posting_text" IS NOT NULL AND "job_posting_text" != ''
  LOOP
    new_ext_id := gen_random_uuid();

    INSERT INTO "external_documents" ("id", "user_id", "title", "category", "source_type", "content", "created_at", "updated_at")
    VALUES (
      new_ext_id,
      r."user_id",
      COALESCE(NULLIF(r."company_name", ''), '(미지정)') || ' 채용공고',
      '채용공고',
      'text',
      r."job_posting_text",
      NOW(),
      NOW()
    );

    INSERT INTO "cover_letter_external_docs" ("cover_letter_id", "external_document_id")
    VALUES (r.cover_letter_id, new_ext_id);
  END LOOP;
END $$;
```

- [ ] **Step 5: 마이그레이션 실행**

Run: `npx prisma migrate dev`
Expected: 마이그레이션 성공, Prisma Client 재생성

- [ ] **Step 6: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): ExternalDocument 모델 추가 및 jobPostingText 데이터 마이그레이션"
```

---

### Task 2: Validation 스키마

외부 문서 생성/수정 스키마를 작성하고, 기존 자소서·면접 스키마를 수정한다.

**Files:**
- Create: `lib/validations/external-document.ts`
- Modify: `lib/validations/cover-letter.ts`
- Modify: `lib/validations/interview.ts`

- [ ] **Step 1: 외부 문서 validation 테스트 작성**

Create: `tests/lib/validations/external-document.test.ts`

```typescript
import { describe, expect, it } from "vitest"
import {
  createExternalDocumentSchema,
  updateExternalDocumentSchema,
  externalDocumentUploadSchema,
} from "@/lib/validations/external-document"

describe("createExternalDocumentSchema (텍스트)", () => {
  it("유효한 텍스트 문서를 통과한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "네이버 채용공고",
      category: "채용공고",
      content: "프론트엔드 엔지니어를 모집합니다.",
    })
    expect(result.success).toBe(true)
  })

  it("제목이 비어있으면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "",
      content: "내용",
    })
    expect(result.success).toBe(false)
  })

  it("내용이 비어있으면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("내용이 50000자를 초과하면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "a".repeat(50001),
    })
    expect(result.success).toBe(false)
  })

  it("category가 없으면 빈 문자열로 기본값", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "내용",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("")
    }
  })
})

describe("updateExternalDocumentSchema", () => {
  it("제목만 수정 가능하다", () => {
    const result = updateExternalDocumentSchema.safeParse({ title: "새 제목" })
    expect(result.success).toBe(true)
  })

  it("category만 수정 가능하다", () => {
    const result = updateExternalDocumentSchema.safeParse({ category: "JD" })
    expect(result.success).toBe(true)
  })

  it("빈 객체는 실패한다 (최소 1개 필드 필요)", () => {
    const result = updateExternalDocumentSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("externalDocumentUploadSchema", () => {
  it("제목과 카테고리를 검증한다", () => {
    const result = externalDocumentUploadSchema.safeParse({
      title: "파일 문서",
      category: "직무기술서",
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/lib/validations/external-document.test.ts`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 외부 문서 validation 구현**

Create: `lib/validations/external-document.ts`

```typescript
import { z } from "zod"

export const MAX_CONTENT_LENGTH = 50000

export const createExternalDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).default(""),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
})

export const externalDocumentUploadSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).default(""),
})

export const updateExternalDocumentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    category: z.string().max(100).optional(),
    content: z.string().min(1).max(MAX_CONTENT_LENGTH).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "최소 하나의 필드를 포함해야 합니다.",
  })
```

- [ ] **Step 4: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/lib/validations/external-document.test.ts`
Expected: PASS

- [ ] **Step 5: 자소서 validation 수정 테스트**

Modify: `tests/lib/validations/cover-letter.test.ts`

기존 `jobPostingText` 관련 테스트를 `selectedExternalDocumentIds`로 변경:
- `jobPostingText` 필드 제거 확인
- `selectedExternalDocumentIds: z.array(z.string().uuid()).optional()` 추가 확인

- [ ] **Step 6: 자소서 validation 수정**

Modify: `lib/validations/cover-letter.ts`

`createCoverLetterSchema`에서:
- `jobPostingText: z.string().max(10000).optional()` 제거
- `selectedExternalDocumentIds: z.array(z.string().uuid()).optional()` 추가

`coverLetterChatSchema`: 변경 없음 (외부 문서 ID는 DB의 `coverLetterExternalDocs`에서 서버 사이드 조회하므로 클라이언트 전송 불필요)

- [ ] **Step 7: 면접 validation 수정**

Modify: `lib/validations/interview.ts`

`createInterviewSchema`에서:
- `selectedExternalDocumentIds: z.array(z.string().uuid()).optional()` 추가

- [ ] **Step 8: 전체 validation 테스트 실행**

Run: `npx vitest run tests/lib/validations/`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add lib/validations/ tests/lib/validations/
git commit -m "feat(validation): ExternalDocument 스키마 추가, CoverLetter/Interview에 외부 문서 ID 추가"
```

---

### Task 3: ExternalDocument 서비스 (CRUD)

기존 Document 서비스 패턴을 따라 CRUD 서비스를 구현한다.

**Files:**
- Create: `lib/external-documents/service.ts`
- Create: `tests/lib/external-documents/service.test.ts`

- [ ] **Step 1: 서비스 테스트 작성**

Create: `tests/lib/external-documents/service.test.ts`

기존 `tests/lib/documents/service.test.ts` 패턴을 참고하여 작성. 테스트 케이스:
- `createExternalDocument` — 텍스트 입력으로 생성
- `createExternalDocument` — 파일 업로드로 생성
- `getExternalDocument` — 소유권 검증 (미소유 시 null)
- `listExternalDocuments` — 사용자별 목록 (createdAt DESC)
- `updateExternalDocument` — 텍스트 문서: 제목·카테고리·내용 수정
- `updateExternalDocument` — 파일 문서: 내용 수정 시도 시 에러
- `deleteExternalDocument` — 삭제 (NotFound, Forbidden 에러)
- `countExternalDocuments` — 문서 수

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: FAIL

- [ ] **Step 3: 서비스 구현**

Create: `lib/external-documents/service.ts`

```typescript
import { prisma } from "@/lib/prisma"
import { type DocumentType, resolveDocumentType, verifyMagicBytes, MAX_FILE_SIZE } from "@/lib/validations/document"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import { generateDocumentSummary } from "@/lib/documents/summary"

export class ExternalDocumentNotFoundError extends Error {
  constructor() {
    super("외부 문서를 찾을 수 없습니다.")
  }
}

export class ExternalDocumentForbiddenError extends Error {
  constructor() {
    super("이 외부 문서에 대한 권한이 없습니다.")
  }
}

export class ExternalDocumentValidationError extends Error {}

interface CreateTextData {
  title: string
  category?: string
  content: string
}

interface UploadResult {
  id: string
  title: string
  sourceType: string
}

// 텍스트 입력으로 생성
export async function createExternalDocumentFromText(
  userId: string,
  data: CreateTextData,
): Promise<UploadResult> {
  const doc = await prisma.externalDocument.create({
    data: {
      userId,
      title: data.title,
      category: data.category ?? "",
      sourceType: "text",
      content: data.content,
    },
    select: { id: true, title: true, sourceType: true },
  })

  // 비동기 요약 생성
  generateDocumentSummary(userId, data.content)
    .then(async (result) => {
      if (result.summary) {
        await prisma.externalDocument.update({
          where: { id: doc.id },
          data: { summary: result.summary },
        })
      }
    })
    .catch(() => {}) // 요약 실패는 무시

  return doc
}

// 파일 업로드로 생성
export async function createExternalDocumentFromFile(
  userId: string,
  file: File,
  title: string,
  category?: string,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ExternalDocumentValidationError(
      `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.`,
    )
  }

  const fileType = resolveDocumentType(file)
  if (!fileType) {
    throw new ExternalDocumentValidationError(
      "지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 업로드할 수 있습니다.",
    )
  }

  const buffer = await file.arrayBuffer()
  if (!verifyMagicBytes(buffer, fileType)) {
    throw new ExternalDocumentValidationError(
      "파일 내용이 확장자와 일치하지 않습니다.",
    )
  }

  const blob = new Blob([buffer], { type: file.type })
  const [extractedText, storagePath] = await Promise.all([
    parseFile(buffer, fileType),
    uploadFile(userId, file.name, blob),
  ])

  if (!extractedText?.trim()) {
    await deleteFile(storagePath).catch(() => {})
    throw new ExternalDocumentValidationError(
      "파일에서 텍스트를 추출할 수 없습니다.",
    )
  }

  const doc = await prisma.externalDocument.create({
    data: {
      userId,
      title,
      category: category ?? "",
      sourceType: "file",
      fileType,
      originalUrl: storagePath,
      fileSize: file.size,
      content: extractedText,
    },
    select: { id: true, title: true, sourceType: true },
  })

  // 비동기 요약 생성
  generateDocumentSummary(userId, extractedText)
    .then(async (result) => {
      if (result.summary) {
        await prisma.externalDocument.update({
          where: { id: doc.id },
          data: { summary: result.summary },
        })
      }
    })
    .catch(() => {})

  return doc
}

export async function getExternalDocument(id: string, userId: string) {
  const doc = await prisma.externalDocument.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      sourceType: true,
      fileType: true,
      fileSize: true,
      content: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  })
  if (!doc) return null
  if (doc.userId !== userId) return null
  const { userId: _, ...rest } = doc
  return rest
}

export async function listExternalDocuments(userId: string) {
  return prisma.externalDocument.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      category: true,
      sourceType: true,
      fileType: true,
      fileSize: true,
      summary: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function countExternalDocuments(userId: string) {
  return prisma.externalDocument.count({ where: { userId } })
}

export async function updateExternalDocument(
  id: string,
  userId: string,
  data: { title?: string; category?: string; content?: string },
) {
  const doc = await prisma.externalDocument.findUnique({
    where: { id },
    select: { userId: true, sourceType: true },
  })
  if (!doc) throw new ExternalDocumentNotFoundError()
  if (doc.userId !== userId) throw new ExternalDocumentForbiddenError()

  // 파일 문서는 내용 수정 불가
  if (doc.sourceType === "file" && data.content !== undefined) {
    throw new ExternalDocumentValidationError(
      "파일로 업로드된 문서의 내용은 수정할 수 없습니다.",
    )
  }

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.category !== undefined) updateData.category = data.category
  if (data.content !== undefined) updateData.content = data.content

  return prisma.externalDocument.update({
    where: { id },
    data: updateData,
    select: { id: true, title: true, category: true, sourceType: true },
  })
}

export async function deleteExternalDocument(
  id: string,
  userId: string,
): Promise<void> {
  const doc = await prisma.externalDocument.findUnique({
    where: { id },
    select: { userId: true, originalUrl: true },
  })
  if (!doc) throw new ExternalDocumentNotFoundError()
  if (doc.userId !== userId) throw new ExternalDocumentForbiddenError()

  if (doc.originalUrl) {
    await deleteFile(doc.originalUrl).catch(() => {})
  }

  await prisma.externalDocument.delete({ where: { id } })
}
```

- [ ] **Step 4: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/lib/external-documents/service.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/external-documents/ tests/lib/external-documents/
git commit -m "feat(service): ExternalDocument CRUD 서비스 구현"
```

---

### Task 4: ExternalDocument API 라우트

기존 Document API 라우트 패턴을 따라 REST API를 구현한다.

**Files:**
- Create: `app/api/external-documents/route.ts`
- Create: `app/api/external-documents/[id]/route.ts`
- Create: `tests/app/api/external-documents/route.test.ts`

- [ ] **Step 1: API 테스트 작성**

기존 `tests/app/api/documents/route.test.ts` 패턴을 참고. 테스트 케이스:
- POST (텍스트) — 201 반환, 생성 성공
- POST (파일) — 201 반환, formData로 파일 업로드
- POST — 401 미인증
- GET — 200 목록 반환
- GET /[id] — 200 단건, 404 미존재
- PATCH /[id] — 200 수정, 403 미소유
- DELETE /[id] — 200 삭제, 404 미존재, 403 미소유

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/app/api/external-documents/`
Expected: FAIL

- [ ] **Step 3: 목록/생성 라우트 구현**

Create: `app/api/external-documents/route.ts`

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createExternalDocumentFromText,
  createExternalDocumentFromFile,
  listExternalDocuments,
  ExternalDocumentValidationError,
} from "@/lib/external-documents/service"
import {
  createExternalDocumentSchema,
  externalDocumentUploadSchema,
} from "@/lib/validations/external-document"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const contentType = request.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("multipart/form-data")) {
      // 파일 업로드
      const formData = await request.formData()
      const fileEntry = formData.get("file")
      const file = fileEntry instanceof File ? fileEntry : null
      const title = formData.get("title") as string | null
      const category = formData.get("category") as string | null

      if (!file) {
        return NextResponse.json(
          { error: "파일이 필요합니다." },
          { status: 400 },
        )
      }

      const parsed = externalDocumentUploadSchema.safeParse({
        title: title?.trim(),
        category: category?.trim() ?? "",
      })
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message },
          { status: 400 },
        )
      }

      const result = await createExternalDocumentFromFile(
        user.id,
        file,
        parsed.data.title,
        parsed.data.category,
      )
      return NextResponse.json(result, { status: 201 })
    } else {
      // 텍스트 입력
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          { error: "유효하지 않은 요청입니다." },
          { status: 400 },
        )
      }

      const parsed = createExternalDocumentSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message },
          { status: 400 },
        )
      }

      const result = await createExternalDocumentFromText(user.id, parsed.data)
      return NextResponse.json(result, { status: 201 })
    }
  } catch (error) {
    if (error instanceof ExternalDocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/external-documents]", error)
    return NextResponse.json(
      { error: "외부 문서 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  try {
    const documents = await listExternalDocuments(user.id)
    return NextResponse.json(documents)
  } catch (error) {
    console.error("[GET /api/external-documents]", error)
    return NextResponse.json(
      { error: "외부 문서 목록을 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 단건/수정/삭제 라우트 구현**

Create: `app/api/external-documents/[id]/route.ts`

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getExternalDocument,
  updateExternalDocument,
  deleteExternalDocument,
  ExternalDocumentNotFoundError,
  ExternalDocumentForbiddenError,
  ExternalDocumentValidationError,
} from "@/lib/external-documents/service"
import { updateExternalDocumentSchema } from "@/lib/validations/external-document"

import { UUID_RE } from "@/lib/utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const doc = await getExternalDocument(id, user.id)
    if (!doc) {
      return NextResponse.json(
        { error: "외부 문서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[GET /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서를 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = updateExternalDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 },
    )
  }

  try {
    const result = await updateExternalDocument(id, user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ExternalDocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ExternalDocumentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof ExternalDocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[PATCH /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서 수정에 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteExternalDocument(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ExternalDocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ExternalDocumentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 5: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/app/api/external-documents/`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add app/api/external-documents/ tests/app/api/external-documents/
git commit -m "feat(api): ExternalDocument REST API 라우트 구현"
```

---

### Task 5: CoverLetter 서비스 — 외부 문서 연결

자소서 서비스에서 jobPostingText를 제거하고 외부 문서 연결을 추가한다.

**Files:**
- Modify: `lib/cover-letters/service.ts`
- Modify: `tests/lib/cover-letters/service.test.ts`
- Modify: `app/api/cover-letters/route.ts`
- Modify: `app/api/cover-letters/[id]/documents/route.ts`

- [ ] **Step 1: 기존 테스트 수정 — jobPostingText 참조 제거**

`tests/lib/cover-letters/service.test.ts`에서:
- `jobPostingText` 관련 테스트 데이터 제거
- `selectedExternalDocumentIds` 테스트 추가:
  - 유효한 외부 문서 ID로 생성 시 CoverLetterExternalDoc 생성 확인
  - 미소유 외부 문서 ID 시 CoverLetterForbiddenError

`tests/app/api/cover-letters/route.test.ts`에서:
- 요청 본문의 `jobPostingText` 제거
- `selectedExternalDocumentIds` 추가

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/lib/cover-letters/ tests/app/api/cover-letters/route.test.ts`
Expected: FAIL (jobPostingText가 아직 코드에 존재)

- [ ] **Step 3: CoverLetter 서비스 수정**

Modify: `lib/cover-letters/service.ts`

`CreateCoverLetterData` 인터페이스:
```typescript
interface CreateCoverLetterData {
  title: string
  companyName: string
  position: string
  selectedDocumentIds?: string[]
  selectedExternalDocumentIds?: string[]  // 추가
  // jobPostingText 제거
}
```

`createCoverLetter` 함수에서:
- `jobPostingText: data.jobPostingText` 제거
- 외부 문서 소유권 검증 + CoverLetterExternalDoc 생성 추가:

```typescript
// 외부 문서 선택 (선택 사항)
if (data.selectedExternalDocumentIds && data.selectedExternalDocumentIds.length > 0) {
  const ownedExtCount = await tx.externalDocument.count({
    where: { id: { in: data.selectedExternalDocumentIds }, userId },
  })
  if (ownedExtCount !== data.selectedExternalDocumentIds.length) {
    throw new CoverLetterForbiddenError()
  }

  await tx.coverLetterExternalDoc.createMany({
    data: data.selectedExternalDocumentIds.map((externalDocumentId) => ({
      coverLetterId: coverLetter.id,
      externalDocumentId,
    })),
  })
}
```

`getCoverLetter` 함수의 include에 추가:
```typescript
coverLetterExternalDocs: {
  select: {
    externalDocument: {
      select: { id: true, title: true, category: true, sourceType: true },
    },
  },
},
```

`updateSelectedExternalDocuments` 함수 추가 (기존 `updateSelectedDocuments` 패턴과 동일):
```typescript
export async function updateSelectedExternalDocuments(
  coverLetterId: string,
  userId: string,
  externalDocumentIds: string[],
) {
  return prisma.$transaction(async (tx) => {
    const coverLetter = await tx.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: { userId: true },
    })
    if (!coverLetter) throw new CoverLetterNotFoundError()
    if (coverLetter.userId !== userId) throw new CoverLetterForbiddenError()

    if (externalDocumentIds.length > 0) {
      const ownedCount = await tx.externalDocument.count({
        where: { id: { in: externalDocumentIds }, userId },
      })
      if (ownedCount !== externalDocumentIds.length) {
        throw new CoverLetterForbiddenError()
      }
    }

    await tx.coverLetterExternalDoc.deleteMany({
      where: { coverLetterId },
    })

    if (externalDocumentIds.length > 0) {
      await tx.coverLetterExternalDoc.createMany({
        data: externalDocumentIds.map((externalDocumentId) => ({
          coverLetterId,
          externalDocumentId,
        })),
      })
    }
  })
}
```

- [ ] **Step 4: 자소서 API 라우트 수정**

Modify: `app/api/cover-letters/route.ts` — `parsed.data`에서 `jobPostingText` 제거 (서비스로 그대로 전달하면 됨)

Modify: `app/api/cover-letters/[id]/documents/route.ts` — 외부 문서 변경 지원:

`updateSelectedExternalDocumentsSchema` 추가하거나, 기존 PATCH에 `externalDocumentIds` 파라미터를 추가하여 `updateSelectedExternalDocuments`도 호출.

- [ ] **Step 5: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/lib/cover-letters/ tests/app/api/cover-letters/`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add lib/cover-letters/ app/api/cover-letters/ tests/
git commit -m "feat(cover-letter): jobPostingText 제거, 외부 문서 연결 추가"
```

---

### Task 6: Interview 서비스 — 외부 문서 연결

면접 서비스에 외부 문서 연결을 추가한다.

**Files:**
- Modify: `lib/interviews/service.ts`
- Modify: `app/api/interviews/route.ts`

- [ ] **Step 1: Interview 테스트 수정**

기존 면접 서비스 테스트에 외부 문서 관련 케이스 추가:
- `createInterview` — `selectedExternalDocumentIds`로 외부 문서 연결 확인
- `createInterview` — 미소유 외부 문서 ID 시 InterviewForbiddenError
- `getInterview` — `interviewExternalDocs` include 확인

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/lib/interviews/`
Expected: FAIL

- [ ] **Step 3: Interview 서비스 수정**

Modify: `lib/interviews/service.ts`

`CreateInterviewData` 인터페이스:
```typescript
interface CreateInterviewData {
  title: string
  companyName?: string
  position?: string
  documentIds: string[]
  selectedExternalDocumentIds?: string[]  // 추가
}
```

`createInterview` 트랜잭션 내에 외부 문서 소유권 검증 + InterviewExternalDoc 생성 추가 (CoverLetter와 동일 패턴).

`getInterview` 함수의 include에 추가:
```typescript
interviewExternalDocs: {
  select: {
    externalDocument: {
      select: { id: true, title: true, category: true, sourceType: true },
    },
  },
},
```

- [ ] **Step 4: Interview API 라우트 수정**

Modify: `app/api/interviews/route.ts` — `parsed.data`를 서비스에 그대로 전달 (validation에서 이미 `selectedExternalDocumentIds` 허용)

- [ ] **Step 5: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/lib/interviews/ tests/app/api/interviews/`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add lib/interviews/ app/api/interviews/ tests/lib/interviews/
git commit -m "feat(interview): 외부 문서 연결 추가"
```

---

### Task 7: AI 컨텍스트 + 도구 + 프롬프트 통합

외부 문서를 AI 컨텍스트에 포함하고, readExternalDocument 도구를 추가한다.

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/context.ts`
- Create: `lib/ai/tools/read-external-document.ts`
- Modify: `lib/ai/tools/index.ts`
- Modify: `lib/ai/pipeline/multi-step.ts`
- Modify: `lib/ai/pipeline/classification.ts`
- Modify: `lib/ai/prompts/cover-letter.ts`
- Modify: `lib/ai/prompts/interview.ts`

- [ ] **Step 1: 프롬프트 테스트 수정**

Modify: `tests/lib/ai/prompts/cover-letter.test.ts`:
- `jobPostingText` 관련 테스트 제거
- `readExternalDocument` 안내 문구 포함 테스트 추가

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run tests/lib/ai/`
Expected: FAIL

- [ ] **Step 3: BuildContextOptions 수정**

Modify: `types/ai.ts`

```typescript
export interface BuildContextOptions {
  selectedDocumentIds?: string[]
  selectedExternalDocumentIds?: string[]  // 추가
  includeCareerNotes?: boolean
}
```

- [ ] **Step 4: buildContext 수정**

Modify: `lib/ai/context.ts`

반환 타입에 `externalDocumentCount` 추가:
```typescript
interface BuildContextResult {
  context: string
  careerNoteCount: number
  externalDocumentCount: number  // 추가
}
```

외부 문서 요약 섹션 추가 (기존 개인 문서 조회 후):
```typescript
let externalDocumentCount = 0

if (opts.selectedExternalDocumentIds && opts.selectedExternalDocumentIds.length > 0) {
  const extDocs = await prisma.externalDocument.findMany({
    where: { id: { in: opts.selectedExternalDocumentIds }, userId },
    select: { id: true, title: true, category: true, summary: true },
  })

  externalDocumentCount = extDocs.length

  for (const doc of extDocs) {
    const label = doc.category ? `${doc.category}: ${doc.title}` : doc.title
    if (doc.summary) {
      parts.push(`[외부 문서: ${label} (ID: ${doc.id})]\n${doc.summary}`)
    } else {
      parts.push(`[외부 문서: ${label} (ID: ${doc.id})]\n요약 없음 — readExternalDocument 도구로 전문을 확인하세요`)
    }
  }
}

return { context: parts.join("\n\n---\n\n"), careerNoteCount, externalDocumentCount }
```

- [ ] **Step 5: readExternalDocument 도구 생성**

Create: `lib/ai/tools/read-external-document.ts`

```typescript
import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadExternalDocumentTool(
  userId: string,
  allowedExternalDocumentIds: string[],
) {
  return tool({
    description:
      "외부 문서(채용공고, JD 등)의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    parameters: z.object({
      externalDocumentId: z
        .string()
        .describe("읽을 외부 문서의 ID"),
    }),
    execute: async ({ externalDocumentId }) => {
      if (!allowedExternalDocumentIds.includes(externalDocumentId)) {
        return "해당 외부 문서에 접근할 수 없습니다."
      }
      const doc = await prisma.externalDocument.findFirst({
        where: { id: externalDocumentId, userId },
        select: { title: true, content: true },
      })
      if (!doc) return "외부 문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.content}`
    },
  })
}
```

- [ ] **Step 6: tools/index.ts 수정**

Modify: `lib/ai/tools/index.ts`

```typescript
export { createReadExternalDocumentTool } from "./read-external-document"

export function calculateMaxSteps(
  documentCount: number,
  careerNoteCount: number,
  externalDocumentCount: number,  // 추가
) {
  const steps = Math.min(
    documentCount + careerNoteCount + externalDocumentCount + 2,
    MAX_STEPS,
  )
  return stepCountIs(steps)
}
```

- [ ] **Step 7: multi-step 파이프라인 수정**

Modify: `lib/ai/pipeline/multi-step.ts`

`MultiStepParams` 인터페이스에 `externalDocumentCount: number` 추가. 내부에서 `calculateMaxSteps` 호출 시 3번째 인자로 전달.

- [ ] **Step 8: classification 파이프라인 수정**

Modify: `lib/ai/pipeline/classification.ts`

Classification 스키마에 `externalDocumentsToRead` 추가 (기존 `documentsToRead`와 동일 패턴). 분류 결과에 따라 외부 문서 전문도 서버 사이드에서 조회하여 프롬프트에 포함. `ClassificationParams`에 `selectedExternalDocumentIds` 추가.

- [ ] **Step 9: cover-letter 프롬프트 수정**

Modify: `lib/ai/prompts/cover-letter.ts`

인터페이스에서 `jobPostingText` 제거. 프롬프트 텍스트의 도구 안내에 `readExternalDocument` 추가:
```
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument, readExternalDocument 또는 readCareerNote 도구로 전문을 읽으세요.
```

jobPosting 변수 및 `[채용공고]` 섹션 삭제 (외부 문서는 context에 이미 포함됨).

- [ ] **Step 10: interview 프롬프트 수정**

Modify: `lib/ai/prompts/interview.ts`

도구 안내에 `readExternalDocument` 추가:
```
- 요약만으로 세부 내용이 필요하면 readDocument 또는 readExternalDocument 도구를 사용하세요.
```

- [ ] **Step 11: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/lib/ai/`
Expected: PASS

- [ ] **Step 12: 커밋**

```bash
git add types/ai.ts lib/ai/ tests/lib/ai/
git commit -m "feat(ai): 외부 문서 컨텍스트 통합, readExternalDocument 도구 추가"
```

---

### Task 8: 채팅 라우트 통합

자소서·면접 채팅 라우트에서 외부 문서 도구를 등록한다.

**Files:**
- Modify: `app/api/chat/cover-letter/route.ts`
- Modify: `app/api/chat/interview/route.ts`
- Modify: `tests/app/api/chat/cover-letter/route.test.ts`

- [ ] **Step 1: 채팅 테스트 수정**

Modify: `tests/app/api/chat/cover-letter/route.test.ts`:
- mock 데이터에서 `jobPostingText` 제거
- `coverLetterExternalDocs` mock 추가

- [ ] **Step 2: cover-letter 채팅 라우트 수정**

Modify: `app/api/chat/cover-letter/route.ts`

CoverLetter 로드 시 `jobPostingText` 제거, `coverLetterExternalDocs` 추가:
```typescript
const coverLetter = await prisma.coverLetter.findUnique({
  where: { id: coverLetterId },
  select: {
    userId: true,
    companyName: true,
    position: true,
    coverLetterExternalDocs: {
      select: { externalDocumentId: true },
    },
  },
})
```

외부 문서 허용 ID 추출:
```typescript
const allowedExternalDocIds = coverLetter.coverLetterExternalDocs.map(
  (d) => d.externalDocumentId,
)
```

`buildContext` 호출에 `selectedExternalDocumentIds` 추가:
```typescript
const [{ context, careerNoteCount, externalDocumentCount }, ...] = await Promise.all([
  buildContext(user.id, {
    selectedDocumentIds,
    selectedExternalDocumentIds: allowedExternalDocIds,
    includeCareerNotes: true,
  }),
  getLanguageModel(user.id),
])
```

시스템 프롬프트에서 `jobPostingText` 제거:
```typescript
const system = buildCoverLetterSystemPrompt({
  companyName: coverLetter.companyName,
  position: coverLetter.position,
  context,
})
```

도구에 `readExternalDocument` 추가:
```typescript
tools: {
  readDocument: createReadDocumentTool(user.id, selectedDocumentIds ?? []),
  readExternalDocument: createReadExternalDocumentTool(user.id, allowedExternalDocIds),
  readCareerNote: createReadCareerNoteTool(user.id),
  saveCareerNote: createSaveCareerNoteTool(user.id, conversationId),
},
```

`calculateMaxSteps` 호출에 `externalDocumentCount` 추가.

- [ ] **Step 3: interview 채팅 라우트 수정**

Modify: `app/api/chat/interview/route.ts`

외부 문서 허용 ID 조회 추가:
```typescript
const allowedExtDocs = await prisma.interviewExternalDoc.findMany({
  where: { interviewSessionId },
  select: { externalDocumentId: true },
})
const allowedExternalDocIds = allowedExtDocs.map((d) => d.externalDocumentId)
```

`buildContext`에 `selectedExternalDocumentIds` 추가.

도구에 `readExternalDocument` 추가:
```typescript
tools: {
  readDocument: createReadDocumentTool(user.id, allowedDocIds),
  readExternalDocument: createReadExternalDocumentTool(user.id, allowedExternalDocIds),
},
```

`calculateMaxSteps`에 `externalDocumentCount` 추가.

- [ ] **Step 4: 테스트 실행 — 성공 확인**

Run: `npx vitest run tests/app/api/chat/`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add app/api/chat/ tests/app/api/chat/
git commit -m "feat(chat): 채팅 라우트에 외부 문서 도구 통합"
```

---

### Task 9: 타입 체크 + 전체 테스트

모든 변경사항이 컴파일되고 테스트를 통과하는지 확인한다.

**Files:** 없음 (검증만)

- [ ] **Step 1: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트**

Run: `npx vitest run`
Expected: 전체 PASS (benchmarks/ 제외)

- [ ] **Step 3: 실패 시 수정 → 재실행**

실패한 테스트가 있으면 수정 후 재실행. 특히:
- `tests/lib/validations/cover-letter.test.ts` — jobPostingText 참조 잔재
- `tests/app/api/cover-letters/route.test.ts` — jobPostingText 필드
- `tests/app/api/chat/cover-letter/route.test.ts` — jobPostingText mock

- [ ] **Step 4: 커밋 (수정 사항 있는 경우)**

```bash
git add -A
git commit -m "fix: 타입 체크 및 테스트 수정"
```

---

### Task 10: 문서 업데이트

영향받는 프로젝트 문서를 업데이트한다.

**Files:**
- Modify: `docs/specs/database-schema.md`
- Modify: `docs/specs/api-reference.md`
- Modify: `docs/features/06-cover-letters.md`
- Modify: `docs/features/05-ai-infra.md`
- Modify: `docs/references/spec-deviations.md`

- [ ] **Step 1: database-schema.md 업데이트**

ExternalDocument, CoverLetterExternalDoc, InterviewExternalDoc 테이블 추가. CoverLetter에서 jobPostingText 제거.

- [ ] **Step 2: api-reference.md 업데이트**

`/api/external-documents` CRUD 엔드포인트 문서 추가.

- [ ] **Step 3: 자소서 기능 문서 업데이트**

`docs/features/06-cover-letters.md`에서 jobPostingText 관련 내용을 외부 문서 연결로 변경.

- [ ] **Step 4: AI 인프라 문서 업데이트**

`docs/features/05-ai-infra.md`에 readExternalDocument 도구 추가.

- [ ] **Step 5: spec-deviations.md 업데이트**

조인 테이블 복합 PK 패턴 차이 등록.

- [ ] **Step 6: 커밋**

```bash
git add docs/
git commit -m "docs: ExternalDocument 분리에 따른 문서 업데이트"
```

---

### Task 11: UI 변경 (페이지 + 컴포넌트)

외부 문서 관리 페이지와 자소서·면접 폼 수정. `/frontend-design` 스킬 사용.

**Files:**
- Create: `components/external-documents/` (list, card, upload-dialog, delete-button)
- Create: `app/(dashboard)/external-documents/page.tsx`
- Create: `app/(dashboard)/external-documents/[id]/page.tsx`
- Modify: `components/cover-letters/cover-letter-form.tsx`
- Modify: `components/interviews/interview-form.tsx`
- Modify: `app/(dashboard)/cover-letters/[id]/page.tsx`
- Modify: 사이드바 네비게이션 컴포넌트

> UI 구현은 `/frontend-design` 스킬과 `docs/rules/ui-conventions.md`를 따른다. 상세 코드는 구현 시점에 기존 컴포넌트 패턴(document-list.tsx, document-card.tsx 등)을 참고하여 작성.

- [ ] **Step 1: 외부 문서 목록 페이지 + 컴포넌트**

기존 `documents/` 페이지 패턴을 참고하여:
- `external-document-list.tsx` — 목록 표시 + 낙관적 업데이트 삭제
- `external-document-card.tsx` — 카드 (sourceType 아이콘, category 배지, 요약)
- `upload-dialog.tsx` — 탭 전환 ("텍스트 입력" / "파일 업로드"), category 입력
- `delete-button.tsx` — 삭제 확인 다이얼로그
- `app/(dashboard)/external-documents/page.tsx` — 서버 컴포넌트, listExternalDocuments 호출

- [ ] **Step 2: 외부 문서 상세 페이지**

`app/(dashboard)/external-documents/[id]/page.tsx` — getExternalDocument 호출, 내용 표시

- [ ] **Step 3: CoverLetterForm 수정**

- `jobPostingText` 텍스트 영역 제거
- 외부 문서 선택 체크박스 추가 (개인 문서 체크박스와 동일 패턴)

- [ ] **Step 4: InterviewForm 수정**

- 외부 문서 선택 체크박스 추가 (선택 사항)

- [ ] **Step 5: CoverLetter 상세 페이지에서 외부 문서 로드**

Modify: `app/(dashboard)/cover-letters/[id]/page.tsx` — `listExternalDocuments` 추가 호출, CoverLetterWorkspace에 전달

- [ ] **Step 6: 사이드바에 "외부 문서" 메뉴 추가**

기존 네비게이션 패턴을 따라 추가.

- [ ] **Step 7: 커밋**

```bash
git add components/external-documents/ app/(dashboard)/external-documents/ components/cover-letters/ components/interviews/ app/(dashboard)/cover-letters/
git commit -m "feat(ui): 외부 문서 관리 페이지 및 폼 수정"
```
