# 채팅 컨텍스트 최적화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 시 선택 문서 전문 대신 요약만 전송하고, LLM이 Tool Use로 필요시 전문을 읽는 방식으로 전환하여 토큰 비용을 절감한다.

**Architecture:** DB 스키마에 Document.summary, CareerNote.summary 추가 후 DocumentChunk 제거. buildContext를 요약 기반으로 단순화. 채팅 라우트에 AI SDK `streamText` + `tools` + `stopWhen`으로 readDocument, readCareerNote, saveCareerNote 도구 추가.

**Tech Stack:** Prisma, Vercel AI SDK v6 (`streamText`, `tool`, `stepCountIs`), Zod, Next.js App Router, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-23-chat-context-optimization-design.md`

**Branch:** `feature/chat-context-optimization` (base: `develop`)

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `lib/ai/tools/read-document.ts` | readDocument 도구 정의 (문서 전문 읽기) |
| `lib/ai/tools/read-career-note.ts` | readCareerNote 도구 정의 (커리어노트 전문 읽기) |
| `lib/ai/tools/save-career-note.ts` | saveCareerNote 도구 정의 (커리어노트 생성/갱신) |
| `lib/ai/tools/index.ts` | 도구 모음 re-export + 동적 stepCount 계산 |
| `lib/documents/summary.ts` | 문서 요약 생성 서비스 (generateDocumentSummary) |
| `app/api/documents/[id]/summary/route.ts` | POST — 문서 요약 재생성 API |
| `tests/lib/ai/tools/read-document.test.ts` | readDocument 도구 테스트 |
| `tests/lib/ai/tools/read-career-note.test.ts` | readCareerNote 도구 테스트 |
| `tests/lib/ai/tools/save-career-note.test.ts` | saveCareerNote 도구 테스트 |
| `tests/lib/documents/summary.test.ts` | 문서 요약 생성 테스트 |

### Modified Files

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Document.summary 추가, CareerNote.summary 추가, DocumentChunk 모델 제거, pgvector 확장 제거, UsageFeature에 DOCUMENT_SUMMARY 추가 + EMBEDDING 제거 |
| `lib/documents/service.ts` | 업로드 시 청크/임베딩 제거, 요약 생성 추가, UploadResult에서 chunkCount/embeddingSkipped 제거, _count.chunks 제거 |
| `lib/ai/context.ts` | buildContext 단순화: 요약 기반으로 변경, RAG/인사이트 제거 |
| `lib/ai/embedding.ts` | 파일 삭제 (splitIntoChunks, generateEmbeddings, getEmbeddingModel 모두 제거) |
| `types/ai.ts` | BuildContextOptions에서 query, limitToDocumentIds, includeInsights, maxChunks 제거 |
| `app/api/chat/cover-letter/route.ts` | tools + stopWhen 추가, buildContext 호출 단순화 |
| `app/api/chat/interview/route.ts` | tools(readDocument만) + stopWhen 추가, buildContext 호출 단순화 |
| `lib/ai/prompts/cover-letter.ts` | 시스템 프롬프트에 도구 사용 안내 추가 |
| `lib/ai/prompts/interview.ts` | 시스템 프롬프트에 도구 사용 안내 추가 |
| `lib/career-notes/service.ts` | updateCareerNote에 summary 재생성 로직 추가 |
| `components/documents/document-card.tsx` | 청크 수 표시 제거, 요약 상태 표시 |
| `components/documents/document-list.tsx` | Document 인터페이스에서 _count.chunks 제거, summary 추가 |
| `app/(dashboard)/documents/[id]/page.tsx` | 청크 수 제거, 요약 표시 + 재생성 버튼 추가 |
| `components/cover-letters/cover-letter-form.tsx` | 문서 선택 시 summary null 표시 |
| `components/interviews/interview-form.tsx` | 문서 선택 시 summary null 표시 |
| `tests/lib/documents/service.test.ts` | 청크/임베딩 관련 테스트 제거, 요약 생성 테스트 추가 |
| `tests/lib/ai/context.test.ts` | RAG 테스트 제거, 요약 기반 컨텍스트 테스트로 교체 |

---

## PR 분리 전략

이 플랜은 3개의 PR로 나누어 진행한다:

- **PR 1 (Task 1~3):** DB 마이그레이션 + 임베딩/RAG 제거 + 문서 요약 생성
- **PR 2 (Task 4~6):** buildContext 리팩토링 + 채팅 도구 추가 + 채팅 라우트 변경
- **PR 3 (Task 7~9):** UI 변경 + 커리어노트 요약 + 도구 로딩 표시

---

## Task 1: DB 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDD_chat_context_optimization/migration.sql` (자동 생성)

- [ ] **Step 1: Document 모델에 summary 필드 추가**

`prisma/schema.prisma`의 Document 모델에 추가:

```prisma
model Document {
  // ... 기존 필드
  summary       String?
}
```

- [ ] **Step 2: CareerNote 모델에 summary 필드 추가**

`prisma/schema.prisma`의 CareerNote 모델에 추가:

```prisma
model CareerNote {
  // ... 기존 필드
  summary       String?
}
```

- [ ] **Step 3: UsageFeature enum 변경**

`DOCUMENT_SUMMARY` 추가, `EMBEDDING` 제거:

```prisma
enum UsageFeature {
  COVER_LETTER
  INTERVIEW
  INSIGHT
  DOCUMENT_SUMMARY
  CAREER_NOTE
}
```

- [ ] **Step 4: DocumentChunk 모델 제거**

`prisma/schema.prisma`에서:
- DocumentChunk 모델 삭제
- Document 모델의 `chunks DocumentChunk[]` relation 삭제
- `extensions = [vector]` 제거

- [ ] **Step 5: 마이그레이션 SQL 작성**

`prisma migrate dev`로 마이그레이션 생성 전, 먼저 EMBEDDING 레코드 삭제가 필요하므로 마이그레이션 SQL을 수동 편집:

```sql
-- EMBEDDING 사용량 기록 삭제
DELETE FROM token_usage_logs WHERE feature = 'EMBEDDING';
```

나머지는 Prisma가 자동 생성 (summary 컬럼 추가, DocumentChunk 테이블 drop, enum 변경).

- [ ] **Step 6: 마이그레이션 실행 및 검증**

Run: `npx prisma migrate dev --name chat_context_optimization`
검증: `npx prisma studio`에서 Document에 summary 컬럼, CareerNote에 summary 컬럼 존재 확인. DocumentChunk 테이블 없음 확인.

- [ ] **Step 7: Prisma 클라이언트 생성 확인**

Run: `npx prisma generate`
Run: `npx tsc --noEmit` — 컴파일 에러 확인 (DocumentChunk 참조하는 곳들이 에러 날 것, 이후 Task에서 수정)

- [ ] **Step 8: 커밋**

```bash
git add prisma/
git commit -m "feat: add Document/CareerNote summary, remove DocumentChunk and EMBEDDING"
```

---

## Task 2: 임베딩/RAG 코드 제거

**Files:**
- Delete: `lib/ai/embedding.ts`
- Modify: `lib/ai/context.ts`
- Modify: `lib/documents/service.ts`
- Modify: `types/ai.ts`
- Delete: `tests/lib/ai/embedding.test.ts`
- Modify: `tests/lib/ai/context.test.ts`
- Modify: `tests/lib/documents/service.test.ts`

- [ ] **Step 1: lib/ai/embedding.ts 삭제**

파일 전체 삭제. `getEmbeddingModel`, `splitIntoChunks`, `generateEmbeddings` 모두 제거.

- [ ] **Step 2: tests/lib/ai/embedding.test.ts 삭제**

테스트 파일 전체 삭제.

- [ ] **Step 3: lib/ai/context.ts에서 RAG 관련 코드 제거**

`generateQueryEmbedding`, `searchSimilarChunks`, `SimilarChunk` 인터페이스 제거. `buildContext`는 빈 함수로 임시 변경 (Task 4에서 재작성):

```typescript
import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

/**
 * RAG 컨텍스트 빌더: 선택 문서 요약 + 커리어노트 요약 조합
 * (Task 4에서 구현 예정, 임시 빈 구현)
 */
export async function buildContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  return ""
}
```

- [ ] **Step 4: types/ai.ts BuildContextOptions 단순화**

```typescript
export interface BuildContextOptions {
  selectedDocumentIds?: string[]
  includeCareerNotes?: boolean
}
```

`query`, `limitToDocumentIds`, `includeInsights`, `maxChunks` 제거.

- [ ] **Step 5: lib/documents/service.ts에서 청크/임베딩 관련 코드 제거**

- `import { splitIntoChunks, generateEmbeddings }` 제거
- `uploadDocument`에서 청크 분할, DocumentChunk.createMany, 임베딩 생성, 임베딩 업데이트 로직 제거
- `UploadResult`에서 `chunkCount`, `embeddingSkipped` 필드 제거
- `listDocuments`, `getDocument`에서 `_count: { select: { chunks: true } }` 제거, `summary` 필드를 select에 추가

`UploadResult` 변경:

```typescript
interface UploadResult {
  id: string
  title: string
  type: DocumentType
  fileSize: number
}
```

- [ ] **Step 6: tests/lib/documents/service.test.ts 청크/임베딩 테스트 정리**

- `splitIntoChunks`, `generateEmbeddings` import 제거
- 청크/임베딩 관련 mock과 테스트 케이스 제거
- `_count.chunks` 관련 assertion 제거

- [ ] **Step 7: tests/lib/ai/context.test.ts 정리**

- `embed` import 및 mock 제거
- RAG 관련 테스트 케이스 제거 (Task 4에서 새 테스트 추가)

- [ ] **Step 8: 컴파일 확인**

Run: `npx tsc --noEmit`
UI 컴포넌트의 `_count.chunks` 참조 에러는 Task 7에서 수정하므로 무시 가능. context.ts, service.ts, types/ai.ts에서 에러 없는지 확인.

- [ ] **Step 9: 커밋**

```bash
git add lib/ai/ lib/documents/service.ts types/ai.ts tests/lib/ai/ tests/lib/documents/
git commit -m "refactor: remove embedding, chunking, and RAG code"
```

---

## Task 3: 문서 요약 생성 서비스

**Files:**
- Create: `lib/documents/summary.ts`
- Modify: `lib/documents/service.ts`
- Create: `app/api/documents/[id]/summary/route.ts`
- Create: `tests/lib/documents/summary.test.ts`

- [ ] **Step 1: 요약 생성 테스트 작성**

`tests/lib/documents/summary.test.ts`:

```typescript
import { generateDocumentSummary } from "@/lib/documents/summary"

// mock getLanguageModel, generateText
vi.mock("@/lib/ai/provider")
vi.mock("ai")

describe("generateDocumentSummary", () => {
  it("extractedText에서 1~4줄 요약을 반환한다", async () => {
    // getLanguageModel mock → model 반환
    // generateText mock → { text: "요약 텍스트", usage: {...} } 반환
    const result = await generateDocumentSummary("user-1", "긴 텍스트...")
    expect(result.summary).toBe("요약 텍스트")
    expect(result.usage).toBeDefined()
  })

  it("AI 설정이 없으면 null을 반환한다", async () => {
    // getLanguageModel mock → AiSettingsNotFoundError throw
    const result = await generateDocumentSummary("user-1", "텍스트")
    expect(result.summary).toBeNull()
  })

  it("API 오류 시 null을 반환한다", async () => {
    // generateText mock → Error throw
    const result = await generateDocumentSummary("user-1", "텍스트")
    expect(result.summary).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run tests/lib/documents/summary.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 요약 생성 서비스 구현**

`lib/documents/summary.ts`:

```typescript
import { generateText } from "ai"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

interface SummaryResult {
  summary: string | null
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export async function generateDocumentSummary(
  userId: string,
  extractedText: string,
): Promise<SummaryResult> {
  try {
    const quotaResult = await checkQuotaExceeded(userId)
    if (quotaResult.exceeded) {
      console.warn("쿼터 초과 — 요약 건너뜀")
      return { summary: null }
    }

    const { model, isServerKey, provider, modelId } = await getLanguageModel(userId)

    const { text, usage } = await generateText({
      model,
      system: "당신은 문서 요약 전문가입니다. 주어진 문서의 핵심 내용을 1~4줄로 요약하세요. 직무 경험, 기술 스택, 핵심 성과 위주로 요약합니다.",
      prompt: extractedText,
    })

    const usageData = {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
      totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    }

    await recordUsage({
      userId,
      provider,
      model: modelId,
      feature: "DOCUMENT_SUMMARY",
      ...usageData,
      isServerKey,
      metadata: {},
    }).catch((e) => console.error("요약 토큰 사용량 기록 실패:", e))

    return { summary: text, usage: usageData }
  } catch (error) {
    if (error instanceof AiSettingsNotFoundError) {
      console.warn("AI 설정 없음 — 요약 건너뜀")
      return { summary: null }
    }
    console.error("문서 요약 생성 실패:", error)
    return { summary: null }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/documents/summary.test.ts`
Expected: PASS

- [ ] **Step 5: uploadDocument에 요약 생성 통합**

`lib/documents/service.ts`의 `uploadDocument` 함수에서, Document 저장 후 요약 생성:

```typescript
import { generateDocumentSummary } from "@/lib/documents/summary"

// Document 생성 후 (트랜잭션 밖에서, 실패해도 업로드 성공):
const { summary } = await generateDocumentSummary(userId, extractedText)
if (summary) {
  await prisma.document.update({
    where: { id: document.id },
    data: { summary },
  })
}
```

- [ ] **Step 6: 요약 재생성 API 구현**

`app/api/documents/[id]/summary/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { generateDocumentSummary } from "@/lib/documents/summary"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
    select: { userId: true, extractedText: true },
  })

  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 })
  }

  if (!document.extractedText) {
    return NextResponse.json({ error: "추출된 텍스트가 없습니다." }, { status: 400 })
  }

  const { summary } = await generateDocumentSummary(user.id, document.extractedText)
  if (summary) {
    await prisma.document.update({ where: { id }, data: { summary } })
  }

  return NextResponse.json({ summary })
}
```

- [ ] **Step 7: 커밋**

```bash
git add lib/documents/summary.ts app/api/documents/[id]/summary/ tests/lib/documents/summary.test.ts lib/documents/service.ts
git commit -m "feat: add document summary generation on upload and manual regeneration API"
```

---

## Task 4: buildContext 리팩토링 (요약 기반)

**Files:**
- Modify: `lib/ai/context.ts`
- Modify: `tests/lib/ai/context.test.ts`

- [ ] **Step 1: 새 buildContext 테스트 작성**

`tests/lib/ai/context.test.ts`에 기존 테스트 교체:

```typescript
describe("buildContext", () => {
  it("선택 문서의 요약과 ID를 포함한다", async () => {
    // prisma.document.findMany mock → [{ id, title, summary }]
    const result = await buildContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })
    expect(result).toContain("[문서:")
    expect(result).toContain("doc-1")
  })

  it("summary가 null인 문서는 fallback 메시지를 표시한다", async () => {
    // mock → [{ id, title, summary: null }]
    const result = await buildContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })
    expect(result).toContain("요약 없음")
    expect(result).toContain("readDocument")
  })

  it("includeCareerNotes=true면 전체 확정 커리어노트 요약을 포함한다", async () => {
    // prisma.careerNote.findMany mock → [{ id, title, summary }]
    const result = await buildContext("user-1", {
      includeCareerNotes: true,
    })
    expect(result).toContain("[커리어노트:")
  })

  it("includeCareerNotes 미지정이면 커리어노트를 포함하지 않는다", async () => {
    const result = await buildContext("user-1", {})
    expect(result).not.toContain("[커리어노트:")
  })

  it("selectedDocumentIds가 비어있으면 문서 섹션 없음", async () => {
    const result = await buildContext("user-1", {})
    expect(result).not.toContain("[문서:")
  })
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run tests/lib/ai/context.test.ts`
Expected: FAIL

- [ ] **Step 3: buildContext 재구현**

`lib/ai/context.ts`:

```typescript
import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

export async function buildContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  const parts: string[] = []

  // 1. 선택 문서 요약
  if (opts.selectedDocumentIds && opts.selectedDocumentIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: opts.selectedDocumentIds }, userId },
      select: { id: true, title: true, summary: true },
    })

    for (const doc of docs) {
      if (doc.summary) {
        parts.push(`[문서: ${doc.title} (ID: ${doc.id})]\n${doc.summary}`)
      } else {
        parts.push(`[문서: ${doc.title} (ID: ${doc.id})]\n요약 없음 — readDocument 도구로 전문을 확인하세요`)
      }
    }
  }

  // 2. 커리어노트 요약 (자소서 전용, 전체 확정 노트)
  if (opts.includeCareerNotes) {
    const notes = await prisma.careerNote.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { id: true, title: true, summary: true },
      orderBy: { updatedAt: "desc" },
    })

    for (const note of notes) {
      if (note.summary) {
        parts.push(`[커리어노트: ${note.title} (ID: ${note.id})]\n${note.summary}`)
      } else {
        parts.push(`[커리어노트: ${note.title} (ID: ${note.id})]\n요약 없음 — readCareerNote 도구로 전문을 확인하세요`)
      }
    }
  }

  return parts.join("\n\n---\n\n")
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/context.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/context.ts types/ai.ts tests/lib/ai/context.test.ts
git commit -m "refactor: simplify buildContext to summary-based context"
```

---

## Task 5: 채팅 도구 구현

**Files:**
- Create: `lib/ai/tools/read-document.ts`
- Create: `lib/ai/tools/read-career-note.ts`
- Create: `lib/ai/tools/save-career-note.ts`
- Create: `lib/ai/tools/index.ts`
- Create: `tests/lib/ai/tools/read-document.test.ts`
- Create: `tests/lib/ai/tools/save-career-note.test.ts`

- [ ] **Step 1: readDocument 도구 테스트 작성**

`tests/lib/ai/tools/read-document.test.ts`:

```typescript
describe("createReadDocumentTool", () => {
  it("선택된 문서의 전문을 반환한다", async () => { ... })
  it("선택되지 않은 문서 ID는 에러 메시지를 반환한다", async () => { ... })
  it("존재하지 않는 문서 ID는 에러 메시지를 반환한다", async () => { ... })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/tools/read-document.test.ts`
Expected: FAIL

- [ ] **Step 3: readDocument 도구 구현**

`lib/ai/tools/read-document.ts`:

```typescript
import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadDocumentTool(userId: string, allowedDocumentIds: string[]) {
  return tool({
    description: "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      documentId: z.string().describe("읽을 문서의 ID"),
    }),
    execute: async ({ documentId }) => {
      if (!allowedDocumentIds.includes(documentId)) {
        return "해당 문서에 접근할 수 없습니다."
      }

      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { extractedText: true },
      })

      return doc?.extractedText ?? "문서를 찾을 수 없습니다."
    },
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/tools/read-document.test.ts`
Expected: PASS

- [ ] **Step 5: readCareerNote 도구 테스트 작성**

`tests/lib/ai/tools/read-career-note.test.ts`:

```typescript
describe("createReadCareerNoteTool", () => {
  it("확정된 커리어노트의 전문을 반환한다", async () => { ... })
  it("PENDING 상태의 커리어노트는 접근할 수 없다", async () => { ... })
  it("존재하지 않는 ID는 에러 메시지를 반환한다", async () => { ... })
  it("다른 사용자의 커리어노트는 접근할 수 없다", async () => { ... })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/tools/read-career-note.test.ts`
Expected: FAIL

- [ ] **Step 7: readCareerNote 도구 구현**

`lib/ai/tools/read-career-note.ts`:

```typescript
import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadCareerNoteTool(userId: string) {
  return tool({
    description: "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().describe("읽을 커리어노트의 ID"),
    }),
    execute: async ({ careerNoteId }) => {
      const note = await prisma.careerNote.findFirst({
        where: { id: careerNoteId, userId, status: "CONFIRMED" },
        select: { title: true, content: true, metadata: true },
      })

      if (!note) return "커리어노트를 찾을 수 없습니다."

      const meta = note.metadata as Record<string, string> | null
      const metaLine = meta
        ? Object.entries(meta).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ")
        : ""

      return `[${note.title}]\n${note.content}${metaLine ? `\n${metaLine}` : ""}`
    },
  })
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/tools/read-career-note.test.ts`
Expected: PASS

- [ ] **Step 9: saveCareerNote 도구 테스트 작성**

`tests/lib/ai/tools/save-career-note.test.ts`:

```typescript
describe("createSaveCareerNoteTool", () => {
  it("careerNoteId 없으면 새 커리어노트를 생성한다", async () => { ... })
  it("careerNoteId 있으면 기존 커리어노트를 갱신한다", async () => { ... })
  it("CareerNoteSource를 생성하여 대화와 연결한다", async () => { ... })
  it("다른 사용자의 커리어노트는 갱신할 수 없다", async () => { ... })
})
```

- [ ] **Step 10: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/tools/save-career-note.test.ts`
Expected: FAIL

- [ ] **Step 11: saveCareerNote 도구 구현**

`lib/ai/tools/save-career-note.ts`:

```typescript
import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createSaveCareerNoteTool(userId: string, conversationId: string) {
  return tool({
    description: "커리어노트를 생성하거나 갱신합니다. 반드시 사용자에게 먼저 제안하고 승인을 받은 후 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().optional().describe("갱신할 커리어노트 ID. 없으면 새로 생성"),
      title: z.string().describe("커리어노트 제목"),
      content: z.string().describe("커리어노트 내용"),
      summary: z.string().describe("1~2줄 핵심 요약"),
      metadata: z.object({
        role: z.string().optional(),
        result: z.string().optional(),
        feeling: z.string().optional(),
      }).optional().describe("메타데이터"),
    }),
    execute: async ({ careerNoteId, title, content, summary, metadata }) => {
      if (careerNoteId) {
        // 갱신
        const existing = await prisma.careerNote.findFirst({
          where: { id: careerNoteId, userId, status: "CONFIRMED" },
        })
        if (!existing) return "커리어노트를 찾을 수 없습니다."

        await prisma.$transaction([
          prisma.careerNote.update({
            where: { id: careerNoteId },
            data: { title, content, summary, metadata: metadata ?? undefined },
          }),
          prisma.careerNoteSource.upsert({
            where: {
              careerNoteId_conversationId: { careerNoteId, conversationId },
            },
            create: { careerNoteId, conversationId },
            update: {},
          }),
        ])
        return `커리어노트 "${title}"이(가) 갱신되었습니다.`
      } else {
        // 생성 (트랜잭션으로 원자적 처리)
        await prisma.$transaction(async (tx) => {
          const note = await tx.careerNote.create({
            data: {
              userId,
              title,
              content,
              summary,
              metadata: metadata ?? undefined,
              status: "CONFIRMED",
            },
          })
          await tx.careerNoteSource.create({
            data: { careerNoteId: note.id, conversationId },
          })
        })
        return `커리어노트 "${title}"이(가) 저장되었습니다.`
      }
    },
  })
}
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/tools/`
Expected: PASS

- [ ] **Step 13: index.ts — 도구 모음 + 동적 stepCount**

`lib/ai/tools/index.ts`:

```typescript
import { stepCountIs } from "ai"
export { createReadDocumentTool } from "./read-document"
export { createReadCareerNoteTool } from "./read-career-note"
export { createSaveCareerNoteTool } from "./save-career-note"

const MAX_STEPS = 15

export function calculateMaxSteps(documentCount: number, careerNoteCount: number) {
  const steps = Math.min(documentCount + careerNoteCount + 2, MAX_STEPS)
  return stepCountIs(steps)
}
```

- [ ] **Step 14: 커밋**

```bash
git add lib/ai/tools/ tests/lib/ai/tools/
git commit -m "feat: implement chat tools (readDocument, readCareerNote, saveCareerNote)"
```

---

## Task 6: 채팅 라우트에 Tool Use 통합

**Files:**
- Modify: `app/api/chat/cover-letter/route.ts`
- Modify: `app/api/chat/interview/route.ts`
- Modify: `lib/ai/prompts/cover-letter.ts`
- Modify: `lib/ai/prompts/interview.ts`

- [ ] **Step 1: 자소서 시스템 프롬프트에 도구 안내 추가**

`lib/ai/prompts/cover-letter.ts`:

```typescript
interface CoverLetterPromptParams {
  companyName: string
  position: string
  jobPostingText?: string
  context: string
}

export function buildCoverLetterSystemPrompt(params: CoverLetterPromptParams): string {
  const jobPosting = params.jobPostingText
    ? `\n\n[채용공고]\n${params.jobPostingText}`
    : ""

  return `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 ${params.companyName}의 ${params.position} 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 요약만으로 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구를 사용하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.${jobPosting}

[참고자료]
${params.context}`
}
```

- [ ] **Step 2: 면접 시스템 프롬프트에 도구 안내 추가**

`lib/ai/prompts/interview.ts`:

```typescript
export function buildInterviewSystemPrompt(params: InterviewPromptParams): string {
  const targetInfo =
    params.companyName || params.position
      ? `지원 대상: ${[params.companyName, params.position].filter(Boolean).join(" / ")}\n\n`
      : ""

  return `당신은 경험 많은 면접관입니다.
${targetInfo}아래 참고자료를 바탕으로 모의면접을 진행해주세요:
- 실제 면접처럼 질문을 하나씩 던지세요.
- 사용자의 답변에 대해 구체적인 피드백을 제공하세요.
- 기술 면접과 인성 면접을 적절히 섞어주세요.
- 한국어로 진행하세요.
- 반드시 아래 제공된 참고자료에만 기반하여 질문하세요. 참고자료에 없는 내용은 질문하지 마세요.
- 요약만으로 세부 내용이 필요하면 readDocument 도구를 사용하세요.

[참고자료]
${params.context}`
}
```

- [ ] **Step 3: 자소서 채팅 라우트에 도구 통합**

`app/api/chat/cover-letter/route.ts` 수정:

```typescript
import { createReadDocumentTool, createReadCareerNoteTool, createSaveCareerNoteTool, calculateMaxSteps } from "@/lib/ai/tools"

// buildContext 호출 변경 (lines 94-102):
const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
  buildContext(user.id, {
    selectedDocumentIds,
    includeCareerNotes: true,
  }),
  getLanguageModel(user.id),
])

// 커리어노트 수 조회 (stepCount 계산용)
const careerNoteCount = await prisma.careerNote.count({
  where: { userId: user.id, status: "CONFIRMED" },
})

// streamText에 tools + stopWhen 추가:
const result = streamText({
  model,
  system,
  messages: modelMessages,
  tools: {
    readDocument: createReadDocumentTool(user.id, selectedDocumentIds ?? []),
    readCareerNote: createReadCareerNoteTool(user.id),
    saveCareerNote: createSaveCareerNoteTool(user.id, conversationId),
  },
  stopWhen: calculateMaxSteps(selectedDocumentIds?.length ?? 0, careerNoteCount),
  onFinish: async ({ text, usage }) => {
    // 기존 로직 유지
  },
})
```

- [ ] **Step 4: 면접 채팅 라우트에 도구 통합**

`app/api/chat/interview/route.ts` 수정:

```typescript
import { createReadDocumentTool, calculateMaxSteps } from "@/lib/ai/tools"

// buildContext 호출 변경 (lines 109-115):
const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
  buildContext(user.id, {
    selectedDocumentIds: allowedDocIds,
  }),
  getLanguageModel(user.id),
])

// streamText에 tools + stopWhen 추가:
const result = streamText({
  model,
  system,
  messages: modelMessages,
  tools: {
    readDocument: createReadDocumentTool(user.id, allowedDocIds),
  },
  stopWhen: calculateMaxSteps(allowedDocIds.length, 0),
  onFinish: async ({ text, usage }) => {
    // 기존 로직 유지
  },
})
```

- [ ] **Step 5: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 채팅 라우트 관련 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add app/api/chat/ lib/ai/prompts/ lib/ai/tools/
git commit -m "feat: integrate tool use into cover letter and interview chat routes"
```

---

## Task 7: UI 변경 — 청크 수 제거 + 요약 표시

**Files:**
- Modify: `components/documents/document-card.tsx`
- Modify: `components/documents/document-list.tsx`
- Modify: `app/(dashboard)/documents/[id]/page.tsx`
- Modify: `components/cover-letters/cover-letter-form.tsx`
- Modify: `components/interviews/interview-form.tsx`

- [ ] **Step 1: document-list.tsx — Document 인터페이스 변경**

`_count: { chunks: number }` 제거, `summary: string | null` 추가:

```typescript
interface Document {
  id: string
  title: string
  type: string
  fileSize: number
  createdAt: string
  summary: string | null
}
```

- [ ] **Step 2: document-card.tsx — 청크 수 → 요약 상태 표시**

props 인터페이스에서 `_count: { chunks: number }` 제거, `summary: string | null` 추가.
`{document._count.chunks}개 청크` 표시를 제거하고, 요약 상태 표시:

```tsx
<span>{document.summary ? "요약 완료" : "요약 없음"}</span>
```

- [ ] **Step 3: documents/[id]/page.tsx — 청크 수 제거 + 요약 표시 + 재생성 버튼**

`{document._count.chunks}개` 제거. 요약 섹션 추가:

```tsx
<div>
  <h3>요약</h3>
  {document.summary ? (
    <p>{document.summary}</p>
  ) : (
    <p className="text-muted-foreground">요약이 생성되지 않았습니다.</p>
  )}
  <Button onClick={handleRegenerateSummary}>
    {document.summary ? "요약 재생성" : "요약 생성"}
  </Button>
</div>
```

재생성 버튼은 `POST /api/documents/[id]/summary` 호출.

- [ ] **Step 4: 문서 선택 UI에 "요약 없음" 표시**

`components/cover-letters/cover-letter-form.tsx`와 `components/interviews/interview-form.tsx`에서 문서 목록을 표시할 때, summary가 null인 문서에 뱃지 또는 텍스트로 "요약 없음" 표시.

- [ ] **Step 5: 컴파일 + 화면 확인**

Run: `npx tsc --noEmit`
Run: `npm run dev` → 문서 목록, 상세, 자소서/면접 생성 폼에서 UI 확인.

- [ ] **Step 6: 커밋**

```bash
git add components/documents/ app/\(dashboard\)/documents/ components/cover-letters/ components/interviews/
git commit -m "feat: replace chunk count with summary status in document UI"
```

---

## Task 8: 커리어노트 요약 — 수정 시 재생성

**Files:**
- Modify: `lib/career-notes/service.ts`

- [ ] **Step 1: updateCareerNote에 summary 재생성 로직 추가**

`lib/career-notes/service.ts`의 `updateCareerNote` 함수에서 content가 변경될 때 요약 재생성:

```typescript
import { generateText } from "ai"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"

export async function updateCareerNote(
  userId: string,
  id: string,
  data: UpdateCareerNoteData,
): Promise<void> {
  // 기존 updateMany 로직 유지

  // content가 변경된 경우 summary 재생성
  if (data.content) {
    try {
      const { model, isServerKey, provider, modelId } = await getLanguageModel(userId)
      const { text, usage } = await generateText({
        model,
        system: "주어진 커리어노트의 핵심 내용을 1~2줄로 요약하세요.",
        prompt: data.content,
      })
      await prisma.careerNote.update({
        where: { id },
        data: { summary: text },
      })

      if (usage) {
        await recordUsage({
          userId,
          provider,
          model: modelId,
          feature: "CAREER_NOTE",
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
          isServerKey,
          metadata: {},
        }).catch((e) => console.error("커리어노트 요약 토큰 기록 실패:", e))
      }
    } catch (error) {
      console.error("커리어노트 요약 재생성 실패:", error)
      // 실패해도 업데이트 자체는 성공으로 처리
    }
  }
}
```

- [ ] **Step 2: UpdateCareerNoteData에 summary 필드 추가**

```typescript
interface UpdateCareerNoteData {
  title?: string
  content?: string
  summary?: string
  metadata?: Record<string, string | undefined>
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/career-notes/service.ts
git commit -m "feat: regenerate career note summary on content update"
```

---

## Task 9: 도구 실행 로딩 UI

**Files:**
- 확인 필요: `components/chat/` 또는 `components/cover-letters/cover-letter-chat.tsx`

> **Note:** AI SDK의 `useChat` 훅은 tool call 상태를 자동 처리하지만, 사용자에게 시각적 피드백을 주려면 메시지의 `toolInvocations` 를 확인하여 로딩 상태를 표시해야 한다. 구체적인 구현은 기존 채팅 컴포넌트 구조를 파악한 후 결정.

- [ ] **Step 1: 채팅 컴포넌트에서 tool invocation 상태 확인**

기존 채팅 UI 컴포넌트(`components/chat/` 또는 `components/cover-letters/`)를 읽고, `useChat` 훅의 메시지 구조 파악. AI SDK v6에서 `UIMessage.parts`에 `tool-invocation` 타입이 포함됨.

- [ ] **Step 2: 도구 실행 중 로딩 표시 구현**

채팅 메시지 렌더링에서 `tool-invocation` 파트를 감지하여 상태별 표시:

```tsx
// 메시지의 parts를 순회하며:
if (part.type === "tool-invocation") {
  const toolName = part.toolInvocation.toolName
  const state = part.toolInvocation.state // "call" | "result"

  if (state === "call") {
    // 로딩 표시
    const label = {
      readDocument: "문서를 읽고 있습니다...",
      readCareerNote: "커리어노트를 읽고 있습니다...",
      saveCareerNote: "커리어노트를 저장하고 있습니다...",
    }[toolName] ?? "처리 중..."

    return <div className="text-muted-foreground text-sm">{label}</div>
  }
  // state === "result"면 표시하지 않거나 완료 표시
}
```

- [ ] **Step 3: 컴파일 + 화면 확인**

Run: `npx tsc --noEmit`
Run: `npm run dev` → 채팅에서 도구 호출 시 로딩 표시 확인.

- [ ] **Step 4: 커밋**

```bash
git add components/
git commit -m "feat: show loading indicator during tool execution in chat"
```

---

## Task 10: 최종 검증 + 테스트 정리

- [ ] **Step 1: 전체 테스트 실행**

Run: `npx vitest run`
Expected: 모든 테스트 통과

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: E2E 수동 테스트**

1. 문서 업로드 → 요약 생성 확인
2. 문서 상세 → 요약 표시 + 재생성 버튼 동작
3. 자소서 생성 → 문서 선택 (요약 없는 문서 표시 확인)
4. 자소서 채팅 → LLM이 요약 참고 + readDocument 호출 확인
5. 자소서 채팅 → saveCareerNote 제안 + 승인 흐름 확인
6. 면접 채팅 → readDocument만 동작, 커리어노트 미포함 확인

- [ ] **Step 5: 커밋 + PR 준비**

```bash
git add -A
git commit -m "test: final verification and cleanup"
```
