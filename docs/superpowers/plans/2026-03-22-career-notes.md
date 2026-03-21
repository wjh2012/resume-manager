# Career Notes (커리어노트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 대화(자소서/면접)에서 사용자의 경험을 구조화하여 축적하고, 병합 제안을 통해 점진적으로 커리어 정보를 구축하는 시스템을 만든다.

**Architecture:** Prisma 스키마에 CareerNote, CareerNoteSource, CareerNoteMergeProposal 모델 추가. AI 추출 서비스가 대화에서 커리어노트를 추출하고, 기존 노트와 비교하여 병합 제안을 생성한다. 자소서 AI 컨텍스트에 커리어노트를 주입하되, 모의면접에는 주입하지 않는다.

**Tech Stack:** Prisma, Vercel AI SDK v6 (`generateObject`), Zod, shadcn/ui, Next.js App Router

**Spec:** `docs/superpowers/specs/2026-03-22-career-notes-design.md`

**Branch:** `feature/career-notes` (base: `develop`)

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `lib/career-notes/service.ts` | `extractCareerNotes()`, `listCareerNotes()`, `updateCareerNote()`, `deleteCareerNote()`, `resolveMergeProposal()`, `countCareerNotes()`, `getConfirmedNotes()`, `listPendingProposals()` |
| `lib/career-notes/errors.ts` | `CareerNoteNotFoundError`, `CareerNoteForbiddenError`, `ConversationNotFoundError` |
| `lib/ai/prompts/career-note-extraction.ts` | AI 추출 프롬프트, metadata 키 상수, Zod 스키마 |
| `lib/validations/career-note.ts` | `extractCareerNotesSchema`, `updateCareerNoteSchema`, `resolveMergeProposalSchema`, `listCareerNotesSchema` |
| `app/api/career-notes/extract/route.ts` | POST — 커리어노트 추출 |
| `app/api/career-notes/route.ts` | GET — 커리어노트 목록 (커서 페이지네이션) |
| `app/api/career-notes/[id]/route.ts` | PUT, DELETE — 커리어노트 수정/삭제 |
| `app/api/career-notes/merge-proposals/route.ts` | GET — 미처리 병합 제안 목록 |
| `app/api/career-notes/merge-proposals/[id]/resolve/route.ts` | POST — 병합 제안 처리 |
| `app/(dashboard)/career-notes/page.tsx` | 커리어노트 대시보드 페이지 (Server Component) |
| `app/(dashboard)/career-notes/loading.tsx` | 로딩 상태 |
| `components/career-notes/career-note-list.tsx` | 노트 목록 + 필터/정렬 (Client Component) |
| `components/career-notes/career-note-card.tsx` | 개별 노트 카드 |
| `components/career-notes/career-note-edit-dialog.tsx` | 노트 수정 다이얼로그 |
| `components/career-notes/merge-proposal-banner.tsx` | 병합 제안 알림 배너 |
| `components/career-notes/merge-proposal-dialog.tsx` | 병합 제안 상세 비교 + 승인/거부 다이얼로그 |

### Modified Files

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | CareerNote, CareerNoteSource, CareerNoteMergeProposal 모델 + CareerNoteStatus, MergeProposalStatus enum + UsageFeature에 CAREER_NOTE 추가 |
| `lib/ai/context.ts` | `buildContext()`에 커리어노트 주입 로직 추가 |
| `types/ai.ts` | `BuildContextOptions`에 `includeCareerNotes` 옵션 추가 |
| `components/cover-letters/cover-letter-chat.tsx` | 커리어노트 추출 버튼 추가 |
| `components/interviews/interview-chat.tsx` | 커리어노트 추출 버튼 + 자동 추출 체크박스 추가 |
| `lib/config/navigation.ts` | "커리어노트" 메뉴 항목 추가 |

---

## PR 분리 전략

이 플랜은 2개의 PR로 나누어 진행한다:

- **PR 1 (Task 1~4):** 데이터 모델 + 서비스 레이어 + API + 테스트
- **PR 2 (Task 5~9):** 컨텍스트 주입 + UI + 채팅 연동 + 테스트

> **Note:** Task 5(AI 컨텍스트 주입)는 PR 2로 이동 — 커리어노트 UI가 존재해야 사용자가 노트를 관리할 수 있으므로, 컨텍스트 주입도 UI와 함께 제공.

---

## Task 1: Prisma 스키마 확장

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: enum 추가**

`schema.prisma` 파일의 enum 섹션에 추가:

```prisma
enum CareerNoteStatus {
  CONFIRMED
  PENDING
}

enum MergeProposalStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

`UsageFeature` enum에 `CAREER_NOTE` 추가:

```prisma
enum UsageFeature {
  COVER_LETTER
  INTERVIEW
  INSIGHT
  EMBEDDING
  CAREER_NOTE
}
```

- [ ] **Step 2: CareerNote 모델 추가**

```prisma
model CareerNote {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  title     String           @db.VarChar(200)
  content   String           @db.Text
  metadata  Json?
  status    CareerNoteStatus @default(CONFIRMED)
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  sources CareerNoteSource[]

  mergeProposalsAsSource CareerNoteMergeProposal[] @relation("SourceNote")
  mergeProposalsAsTarget CareerNoteMergeProposal[] @relation("TargetNote")

  @@index([userId, status])
  @@index([userId, createdAt])
  @@map("career_notes")
}
```

- [ ] **Step 3: CareerNoteSource 모델 추가**

```prisma
model CareerNoteSource {
  careerNoteId   String @map("career_note_id") @db.Uuid
  conversationId String @map("conversation_id") @db.Uuid

  careerNote   CareerNote   @relation(fields: [careerNoteId], references: [id], onDelete: Cascade)
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@id([careerNoteId, conversationId])
  @@map("career_note_sources")
}
```

- [ ] **Step 4: CareerNoteMergeProposal 모델 추가**

```prisma
model CareerNoteMergeProposal {
  id                String              @id @default(uuid()) @db.Uuid
  sourceNoteId      String?             @map("source_note_id") @db.Uuid
  targetNoteId      String              @map("target_note_id") @db.Uuid
  suggestedTitle    String              @db.VarChar(200)
  suggestedContent  String              @db.Text
  suggestedMetadata Json?
  status            MergeProposalStatus @default(PENDING)
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  sourceNote CareerNote? @relation("SourceNote", fields: [sourceNoteId], references: [id], onDelete: SetNull)
  targetNote CareerNote @relation("TargetNote", fields: [targetNoteId], references: [id], onDelete: Cascade)

  @@index([sourceNoteId])
  @@index([targetNoteId])
  @@map("career_note_merge_proposals")
}
```

- [ ] **Step 5: User, Conversation 모델에 relation 추가**

`User` 모델에 추가:
```prisma
careerNotes CareerNote[]
```

`Conversation` 모델에 추가:
```prisma
careerNoteSources CareerNoteSource[]
```

- [ ] **Step 6: 마이그레이션 실행**

Run: `npx prisma migrate dev --name add-career-notes`
Expected: Migration created and applied successfully

- [ ] **Step 7: Prisma Client 생성 확인**

Run: `npx prisma generate`
Expected: Generated Prisma Client

- [ ] **Step 8: 커밋**

```bash
git add prisma/
git commit -m "feat(prisma): add CareerNote, CareerNoteSource, CareerNoteMergeProposal models

커리어노트 시스템의 데이터 모델 추가:
- CareerNote: 반정형 metadata JSON, status enum
- CareerNoteSource: 대화-노트 다대다 관계
- CareerNoteMergeProposal: AI 병합 제안 추적
- UsageFeature에 CAREER_NOTE 추가"
```

---

## Task 2: Validation 스키마 + 에러 클래스 + AI 프롬프트

**Files:**
- Create: `lib/validations/career-note.ts`
- Create: `lib/career-notes/errors.ts`
- Create: `lib/ai/prompts/career-note-extraction.ts`

- [ ] **Step 1: 에러 클래스 작성**

`lib/career-notes/errors.ts`:

```typescript
export class CareerNoteNotFoundError extends Error {
  constructor() {
    super("커리어노트를 찾을 수 없습니다.")
  }
}

export class CareerNoteForbiddenError extends Error {
  constructor() {
    super("이 커리어노트에 대한 권한이 없습니다.")
  }
}

export class ConversationNotFoundError extends Error {
  constructor() {
    super("대화를 찾을 수 없습니다.")
  }
}

export class MergeProposalNotFoundError extends Error {
  constructor() {
    super("병합 제안을 찾을 수 없습니다.")
  }
}

export class MergeProposalForbiddenError extends Error {
  constructor() {
    super("이 병합 제안에 대한 권한이 없습니다.")
  }
}
```

- [ ] **Step 2: metadata Zod 스키마 + AI 프롬프트 작성**

`lib/ai/prompts/career-note-extraction.ts`:

```typescript
import { z } from "zod"

export const CAREER_NOTE_METADATA_KEYS = [
  "where",
  "role",
  "what",
  "result",
  "challenge",
  "motivation",
  "feeling",
  "lesson",
] as const

export const careerNoteMetadataSchema = z
  .object({
    where: z.string().optional(),
    role: z.string().optional(),
    what: z.string().optional(),
    result: z.string().optional(),
    challenge: z.string().optional(),
    motivation: z.string().optional(),
    feeling: z.string().optional(),
    lesson: z.string().optional(),
  })
  .strip()

// AI에게 전달할 추출 결과 스키마 (기존 노트 비교 포함)
export const careerNoteExtractionSchema = z.object({
  notes: z.array(
    z.object({
      title: z.string().max(200),
      content: z.string().max(5000),
      metadata: careerNoteMetadataSchema,
      relatedExistingNoteId: z.string().uuid().nullable(),
      suggestedMerge: z
        .object({
          title: z.string().max(200),
          content: z.string().max(5000),
          metadata: careerNoteMetadataSchema,
        })
        .nullable(),
    }),
  ),
})

export function buildCareerNoteExtractionPrompt(
  existingNotes: { id: string; title: string; content: string; metadata: unknown }[],
): string {
  const existingNotesSection =
    existingNotes.length > 0
      ? `\n\n[기존 커리어노트]\n${existingNotes
          .map(
            (n) =>
              `- ID: ${n.id}\n  제목: ${n.title}\n  내용: ${n.content}\n  메타데이터: ${JSON.stringify(n.metadata)}`,
          )
          .join("\n")}`
      : ""

  return `당신은 커리어코치의 상담 노트를 작성하는 전문가입니다.
대화 내용을 분석하여 사용자의 커리어 경험을 구조화된 노트로 추출하세요.

## 핵심 원칙
- 일반적인 이력서의 성과 나열이 아닙니다
- 객관적 사실뿐 아니라 사용자의 주관적 경험(감정, 태도, 가치관, 깨달음)까지 포착하세요
- 객관적으로 큰 성과를 냈지만 별 감흥이 없었던 경험과, 작은 일이지만 큰 의미를 느낀 경험을 구분하세요
- 구체적이고 재활용 가능한 정보만 추출하세요. 일반적인 내용은 제외하세요
- content는 최대 5000자, title은 최대 200자로 작성하세요

## metadata 필드 (모두 선택적)
- where: 프로젝트/회사/환경
- role: 역할
- what: 행동/상황
- result: 성과/결과 (객관적 지표)
- challenge: 어려웠던 점, 장애물
- motivation: 동기, 왜 그 행동을 했는지
- feeling: 느낀 점, 감정, 내면의 반응
- lesson: 배운 점, 깨달음

## 기존 노트와의 비교
기존 커리어노트가 있으면 아래에 제시됩니다.
새로 추출한 노트가 기존 노트와 관련 있으면:
1. relatedExistingNoteId에 기존 노트 ID를 지정하세요
2. suggestedMerge에 두 노트를 병합한 결과(title, content, metadata)를 제안하세요
관련 없으면 relatedExistingNoteId를 null, suggestedMerge를 null로 두세요.
${existingNotesSection}`
}
```

- [ ] **Step 3: Validation 스키마 작성**

`lib/validations/career-note.ts`:

```typescript
import { z } from "zod"
import { careerNoteMetadataSchema } from "@/lib/ai/prompts/career-note-extraction"

export const extractCareerNotesSchema = z.object({
  conversationId: z.string().uuid("올바른 대화 ID 형식이 아닙니다."),
})

export const updateCareerNoteSchema = z.object({
  title: z.string({ error: "제목을 입력해주세요." }).min(1).max(200).optional(),
  content: z
    .string({ error: "내용을 입력해주세요." })
    .min(1)
    .max(5000)
    .optional(),
  metadata: careerNoteMetadataSchema.optional(),
})

export const resolveMergeProposalSchema = z.object({
  action: z.enum(["accept", "reject"], {
    error: "올바른 액션을 선택해주세요.",
  }),
  editedTitle: z.string().min(1).max(200).optional(),
  editedContent: z.string().min(1).max(5000).optional(),
  editedMetadata: careerNoteMetadataSchema.optional(),
})

export const listCareerNotesSchema = z.object({
  status: z.enum(["confirmed", "pending"]).optional().default("confirmed"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})
```

- [ ] **Step 4: 커밋**

```bash
git add lib/career-notes/errors.ts lib/ai/prompts/career-note-extraction.ts lib/validations/career-note.ts
git commit -m "feat: add career notes validation, errors, and AI extraction prompt

커리어노트 시스템의 기반 모듈:
- 에러 클래스 5종 (NotFound, Forbidden, ConversationNotFound 등)
- AI 추출 프롬프트 (커리어코치 상담 노트 컨셉, 8개 metadata 필드)
- Zod validation 스키마 (추출, 수정, 병합 제안 처리, 목록 조회)"
```

---

## Task 3: 서비스 레이어

**Files:**
- Create: `lib/career-notes/service.ts`

- [ ] **Step 1: 테스트 파일 생성**

`[test-writer]` 에이전트로 서비스 테스트 작성. 테스트 대상:
- `extractCareerNotes()`: 대화에서 노트 추출, 기존 노트와 비교 후 병합 제안 생성
- `listCareerNotes()`: 커서 기반 페이지네이션, status 필터
- `updateCareerNote()`: 권한 체크, 필드 업데이트
- `deleteCareerNote()`: 권한 체크, cascade 삭제
- `resolveMergeProposal()`: accept 시 트랜잭션 처리, reject 시 CONFIRMED 전환
- 중복 추출 방지: 재추출 시 PENDING 노트만 삭제

기존 테스트 패턴 참조: `__tests__/` 디렉토리 확인.

- [ ] **Step 2: `listCareerNotes()` 구현**

```typescript
import { prisma } from "@/lib/prisma"
import type { CareerNoteStatus } from "@prisma/client"

export async function listCareerNotes(
  userId: string,
  options: {
    status?: "confirmed" | "pending"
    cursor?: string
    limit?: number
  } = {},
) {
  const { status = "confirmed", cursor, limit = 20 } = options
  const prismaStatus = status.toUpperCase() as CareerNoteStatus

  const notes = await prisma.careerNote.findMany({
    where: { userId, status: prismaStatus },
    include: {
      sources: {
        include: {
          conversation: {
            select: {
              id: true,
              type: true,
              coverLetterId: true,
              interviewSessionId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // +1 for cursor check
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = notes.length > limit
  const result = hasMore ? notes.slice(0, limit) : notes
  const nextCursor = hasMore ? result[result.length - 1]?.id ?? null : null

  return { notes: result, nextCursor }
}
```

- [ ] **Step 3: 테스트 실행하여 `listCareerNotes` 통과 확인**

Run: `npx vitest run --reporter=verbose tests/lib/career-notes/service.test.ts -t "listCareerNotes"`
Expected: PASS

- [ ] **Step 4: `countCareerNotes()` + `getConfirmedNotes()` + `countPendingProposals()` + `listPendingProposals()` 구현**

```typescript
export async function countCareerNotes(userId: string) {
  const [confirmed, pending] = await Promise.all([
    prisma.careerNote.count({ where: { userId, status: "CONFIRMED" } }),
    prisma.careerNote.count({ where: { userId, status: "PENDING" } }),
  ])
  return { confirmed, pending, total: confirmed + pending }
}

export async function getConfirmedNotes(userId: string, limit = 50) {
  return prisma.careerNote.findMany({
    where: { userId, status: "CONFIRMED" },
    select: { id: true, title: true, content: true, metadata: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
}

export async function countPendingProposals(userId: string) {
  return prisma.careerNoteMergeProposal.count({
    where: {
      sourceNote: { userId },
      status: "PENDING",
    },
  })
}

export async function listPendingProposals(userId: string) {
  return prisma.careerNoteMergeProposal.findMany({
    where: {
      sourceNote: { userId },
      status: "PENDING",
    },
    include: {
      sourceNote: {
        select: { id: true, title: true, content: true, metadata: true },
      },
      targetNote: {
        select: { id: true, title: true, content: true, metadata: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
```

- [ ] **Step 5: `extractCareerNotes()` 구현**

핵심 플로우:
1. 대화 + 메시지 조회
2. quota 체크
3. 기존 confirmed 노트 조회 (최대 50개)
4. AI `generateObject()` 호출 — 추출 + 비교
5. 토큰 사용량 기록
6. 중복 추출 방지: 해당 대화의 PENDING 노트 + 관련 PENDING proposal 삭제
7. 트랜잭션으로 노트 생성 + 출처 기록 + 병합 제안 생성

```typescript
import { generateObject } from "ai"
import { getLanguageModel } from "@/lib/ai/provider"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"
import {
  buildCareerNoteExtractionPrompt,
  careerNoteExtractionSchema,
} from "@/lib/ai/prompts/career-note-extraction"
import {
  ConversationNotFoundError,
} from "@/lib/career-notes/errors"

export async function extractCareerNotes(
  userId: string,
  conversationId: string,
) {
  // 1. 대화 + 메시지 조회
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!conversation) throw new ConversationNotFoundError()
  if (conversation.messages.length === 0) return { notes: [], proposals: [] }

  // 2. quota 체크
  const quotaResult = await checkQuotaExceeded(userId)
  if (quotaResult.exceeded) throw new QuotaExceededError()

  // 3. 기존 confirmed 노트 조회
  const existingNotes = await getConfirmedNotes(userId)

  // 4. AI 추출
  const { model, isServerKey, provider: aiProvider, modelId } =
    await getLanguageModel(userId)

  const { object, usage } = await generateObject({
    model,
    schema: careerNoteExtractionSchema,
    system: buildCareerNoteExtractionPrompt(existingNotes),
    prompt: conversation.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n"),
  })

  // 5. 토큰 사용량 기록
  if (usage) {
    await recordUsage({
      userId,
      provider: aiProvider,
      model: modelId,
      feature: "CAREER_NOTE",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      isServerKey,
      metadata: { conversationId },
    }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
  }

  if (object.notes.length === 0) return { notes: [], proposals: [] }

  // 6-7. 트랜잭션: 중복 정리 + 노트 생성 + 출처 + 병합 제안
  const result = await prisma.$transaction(async (tx) => {
    // 6. 중복 추출 방지: 해당 대화의 PENDING 노트 관련 정리
    const existingPendingNotes = await tx.careerNote.findMany({
      where: {
        userId,
        status: "PENDING",
        sources: { some: { conversationId } },
      },
      select: { id: true },
    })

    if (existingPendingNotes.length > 0) {
      const pendingIds = existingPendingNotes.map((n) => n.id)
      await tx.careerNoteMergeProposal.deleteMany({
        where: {
          sourceNoteId: { in: pendingIds },
          status: "PENDING",
        },
      })
      await tx.careerNote.deleteMany({
        where: { id: { in: pendingIds } },
      })
    }

    // 7. 새 노트 생성
    const createdNotes = []
    const createdProposals = []

    for (const note of object.notes) {
      const hasRelated = note.relatedExistingNoteId && note.suggestedMerge
      const status = hasRelated ? "PENDING" : "CONFIRMED"

      const created = await tx.careerNote.create({
        data: {
          userId,
          title: note.title,
          content: note.content,
          metadata: note.metadata,
          status,
          sources: {
            create: { conversationId },
          },
        },
      })

      createdNotes.push(created)

      if (hasRelated && note.suggestedMerge) {
        const proposal = await tx.careerNoteMergeProposal.create({
          data: {
            sourceNoteId: created.id,
            targetNoteId: note.relatedExistingNoteId!,
            suggestedTitle: note.suggestedMerge.title,
            suggestedContent: note.suggestedMerge.content,
            suggestedMetadata: note.suggestedMerge.metadata,
          },
        })
        createdProposals.push(proposal)
      }
    }

    return { notes: createdNotes, proposals: createdProposals }
  })

  return result
}
```

- [ ] **Step 6: 테스트 실행하여 `extractCareerNotes` 통과 확인**

Run: `npx vitest run --reporter=verbose tests/lib/career-notes/service.test.ts -t "extractCareerNotes"`
Expected: PASS

- [ ] **Step 7: `updateCareerNote()` 구현**

```typescript
import {
  CareerNoteNotFoundError,
  CareerNoteForbiddenError,
} from "@/lib/career-notes/errors"

interface UpdateCareerNoteData {
  title?: string
  content?: string
  metadata?: Record<string, string | undefined>
}

export async function updateCareerNote(
  userId: string,
  id: string,
  data: UpdateCareerNoteData,
) {
  const result = await prisma.careerNote.updateMany({
    where: { id, userId },
    data,
  })

  if (result.count === 0) {
    const exists = await prisma.careerNote.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new CareerNoteNotFoundError()
    throw new CareerNoteForbiddenError()
  }
}
```

- [ ] **Step 8: `deleteCareerNote()` 구현**

```typescript
export async function deleteCareerNote(userId: string, id: string) {
  const result = await prisma.careerNote.deleteMany({
    where: { id, userId },
  })

  if (result.count === 0) {
    const exists = await prisma.careerNote.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new CareerNoteNotFoundError()
    throw new CareerNoteForbiddenError()
  }
}
```

- [ ] **Step 9: `resolveMergeProposal()` 구현**

```typescript
import {
  MergeProposalNotFoundError,
  MergeProposalForbiddenError,
} from "@/lib/career-notes/errors"

interface ResolveData {
  action: "accept" | "reject"
  editedTitle?: string
  editedContent?: string
  editedMetadata?: Record<string, string | undefined>
}

export async function resolveMergeProposal(
  userId: string,
  proposalId: string,
  data: ResolveData,
) {
  const proposal = await prisma.careerNoteMergeProposal.findUnique({
    where: { id: proposalId },
    include: {
      sourceNote: {
        select: { id: true, userId: true, sources: true },
      },
      targetNote: {
        select: { id: true, userId: true },
      },
    },
  })

  if (!proposal) throw new MergeProposalNotFoundError()
  if (proposal.sourceNote.userId !== userId) throw new MergeProposalForbiddenError()

  if (data.action === "accept") {
    const title = data.editedTitle ?? proposal.suggestedTitle
    const content = data.editedContent ?? proposal.suggestedContent
    const metadata = data.editedMetadata ?? proposal.suggestedMetadata

    await prisma.$transaction(async (tx) => {
      // 1. sourceNote의 출처를 targetNote로 이전
      for (const source of proposal.sourceNote.sources) {
        await tx.careerNoteSource.upsert({
          where: {
            careerNoteId_conversationId: {
              careerNoteId: proposal.targetNoteId,
              conversationId: source.conversationId,
            },
          },
          create: {
            careerNoteId: proposal.targetNoteId,
            conversationId: source.conversationId,
          },
          update: {},
        })
      }

      // 2. proposal status 업데이트 (sourceNote cascade 삭제 전에!)
      await tx.careerNoteMergeProposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      })

      // 3. targetNote 업데이트
      await tx.careerNote.update({
        where: { id: proposal.targetNoteId },
        data: { title, content, metadata },
      })

      // 4. sourceNote 삭제 (cascade로 sources도 삭제됨, proposal은 이미 업데이트됨)
      await tx.careerNote.delete({
        where: { id: proposal.sourceNoteId },
      })
    })
  } else {
    // reject: sourceNote를 CONFIRMED로 전환
    await prisma.$transaction([
      prisma.careerNoteMergeProposal.update({
        where: { id: proposalId },
        data: { status: "REJECTED" },
      }),
      prisma.careerNote.update({
        where: { id: proposal.sourceNoteId },
        data: { status: "CONFIRMED" },
      }),
    ])
  }
}
```

- [ ] **Step 10: 테스트 실행하여 전체 서비스 통과 확인**

Run: `npx vitest run --reporter=verbose tests/lib/career-notes/service.test.ts`
Expected: All tests PASS

- [ ] **Step 11: 커밋**

```bash
git add lib/career-notes/service.ts tests/lib/career-notes/
git commit -m "feat: implement career notes service layer

커리어노트 서비스 레이어 구현:
- extractCareerNotes: AI 추출 + 기존 노트 비교 + 병합 제안 생성
- listCareerNotes: 커서 기반 페이지네이션 + status 필터
- updateCareerNote/deleteCareerNote: 권한 체크 포함
- resolveMergeProposal: accept/reject 트랜잭션 처리
- 중복 추출 방지 로직"
```

---

## Task 4: API 라우트

**Files:**
- Create: `app/api/career-notes/extract/route.ts`
- Create: `app/api/career-notes/route.ts`
- Create: `app/api/career-notes/[id]/route.ts`
- Create: `app/api/career-notes/merge-proposals/[id]/resolve/route.ts`

- [ ] **Step 1: POST /api/career-notes/extract 구현**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractCareerNotesSchema } from "@/lib/validations/career-note"
import { extractCareerNotes } from "@/lib/career-notes/service"
import { ConversationNotFoundError } from "@/lib/career-notes/errors"
import { QuotaExceededError } from "@/lib/token-usage/quota"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = extractCareerNotesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다.",
      },
      { status: 400 },
    )
  }

  try {
    const result = await extractCareerNotes(
      user.id,
      parsed.data.conversationId,
    )
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/career-notes/extract]", error)
    return NextResponse.json(
      { error: "커리어노트 추출에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: GET /api/career-notes 구현**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listCareerNotesSchema } from "@/lib/validations/career-note"
import { listCareerNotes } from "@/lib/career-notes/service"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = listCareerNotesSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다.",
      },
      { status: 400 },
    )
  }

  try {
    const result = await listCareerNotes(user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/career-notes]", error)
    return NextResponse.json(
      { error: "커리어노트 목록을 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 3: PUT, DELETE /api/career-notes/[id] 구현**

기존 `app/api/insights/[id]/route.ts` 패턴 그대로 따름. `UUID_RE` 검증, 에러 핸들링 포함.

- [ ] **Step 3.5: GET /api/career-notes/merge-proposals 구현**

`app/api/career-notes/merge-proposals/route.ts` — 미처리 병합 제안 목록:

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listPendingProposals } from "@/lib/career-notes/service"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  try {
    const proposals = await listPendingProposals(user.id)
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("[GET /api/career-notes/merge-proposals]", error)
    return NextResponse.json(
      { error: "병합 제안 목록을 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: POST /api/career-notes/merge-proposals/[id]/resolve 구현**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UUID_RE } from "@/lib/utils"
import { resolveMergeProposalSchema } from "@/lib/validations/career-note"
import { resolveMergeProposal } from "@/lib/career-notes/service"
import {
  MergeProposalNotFoundError,
  MergeProposalForbiddenError,
} from "@/lib/career-notes/errors"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 병합 제안 ID 형식입니다." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = resolveMergeProposalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다.",
      },
      { status: 400 },
    )
  }

  try {
    await resolveMergeProposal(user.id, id, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof MergeProposalNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof MergeProposalForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/career-notes/merge-proposals/resolve]", error)
    return NextResponse.json(
      { error: "병합 제안 처리에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 5: 커밋**

```bash
git add app/api/career-notes/
git commit -m "feat: add career notes API routes

API 라우트 5종:
- POST /api/career-notes/extract: 커리어노트 추출
- GET /api/career-notes: 목록 조회 (커서 페이지네이션)
- PUT/DELETE /api/career-notes/[id]: 수정/삭제
- GET /api/career-notes/merge-proposals: 미처리 병합 제안 목록
- POST /api/career-notes/merge-proposals/[id]/resolve: 병합 제안 처리"
```

---

## Task 5: AI 컨텍스트 주입

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/context.ts`

- [ ] **Step 1: BuildContextOptions에 includeCareerNotes 추가**

`types/ai.ts`의 `BuildContextOptions`에 추가:

```typescript
includeCareerNotes?: boolean
```

- [ ] **Step 2: buildContext()에 커리어노트 주입 로직 추가**

`lib/ai/context.ts`의 `buildContext()` 함수에서 인사이트 주입 블록 다음에 추가:

```typescript
// Career Notes injection (커리어노트 주입)
// 추출 컨텍스트에서는 최대 50개, 자소서 컨텍스트에서는 최대 10개 사용
if (opts.includeCareerNotes && userId) {
  const careerNotes = await prisma.careerNote.findMany({
    where: { userId, status: "CONFIRMED" },
    select: { title: true, content: true, metadata: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  })

  if (careerNotes.length > 0) {
    for (const note of careerNotes) {
      const meta = note.metadata as Record<string, string> | null
      const metaLine = meta
        ? [
            meta.role && `역할: ${meta.role}`,
            meta.result && `성과: ${meta.result}`,
            meta.feeling && `느낀 점: ${meta.feeling}`,
          ]
            .filter(Boolean)
            .join(" | ")
        : ""

      parts.push(
        `[커리어노트: ${note.title}]\n${note.content}${metaLine ? `\n${metaLine}` : ""}`,
      )
    }
  }
}
```

- [ ] **Step 3: 자소서 채팅에서 includeCareerNotes 전달 확인**

자소서 채팅 라우트 (`app/api/chat/cover-letter/route.ts`)에서 `buildContext()` 호출 시 `includeCareerNotes: true` 추가. 면접 채팅에는 추가하지 않음 (의도적 설계).

- [ ] **Step 4: 커밋**

```bash
git add types/ai.ts lib/ai/context.ts app/api/chat/cover-letter/route.ts
git commit -m "feat: inject career notes into cover letter AI context

자소서 작성 시 커리어노트를 AI 컨텍스트에 주입.
모의면접에는 의도적으로 주입하지 않음 (면접관 역할 설계)."
```

---

## Task 6: 네비게이션 + 페이지 셸

**Files:**
- Modify: `lib/config/navigation.ts`
- Create: `app/(dashboard)/career-notes/page.tsx`
- Create: `app/(dashboard)/career-notes/loading.tsx`

- [ ] **Step 1: 네비게이션 메뉴 추가**

`lib/config/navigation.ts`의 `navItems` 배열에서 인사이트 다음에 추가:

```typescript
{ icon: BookOpen, label: "커리어노트", href: "/career-notes" },
```

`BookOpen`은 `lucide-react`에서 import. 커리어코치의 상담 노트 컨셉에 맞는 아이콘.

- [ ] **Step 2: 로딩 페이지 작성**

`app/(dashboard)/career-notes/loading.tsx`:

```typescript
export default function CareerNotesLoading() {
  return (
    <p className="text-muted-foreground py-12 text-center">불러오는 중...</p>
  )
}
```

- [ ] **Step 3: 페이지 작성**

`app/(dashboard)/career-notes/page.tsx` — 기존 insights/page.tsx 패턴 따름:

```typescript
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import {
  listCareerNotes,
  countCareerNotes,
  countPendingProposals,
} from "@/lib/career-notes/service"
import { CareerNoteList } from "@/components/career-notes/career-note-list"

export default async function CareerNotesPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">커리어노트</h1>
      <Suspense
        fallback={
          <p className="text-muted-foreground py-12 text-center">
            불러오는 중...
          </p>
        }
      >
        <CareerNoteListSection userId={user.id} />
      </Suspense>
    </div>
  )
}

async function CareerNoteListSection({ userId }: { userId: string }) {
  const [{ notes }, counts, pendingProposalCount] = await Promise.all([
    listCareerNotes(userId, { status: "confirmed" }),
    countCareerNotes(userId),
    countPendingProposals(userId),
  ])

  // Server → Client 경계를 위한 직렬화
  const serialized = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    metadata: n.metadata,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    sources: n.sources.map((s) => ({
      conversationId: s.conversationId,
      conversation: s.conversation
        ? {
            id: s.conversation.id,
            type: s.conversation.type,
            coverLetterId: s.conversation.coverLetterId,
            interviewSessionId: s.conversation.interviewSessionId,
          }
        : null,
    })),
  }))

  return (
    <CareerNoteList
      notes={serialized}
      counts={counts}
      pendingProposalCount={pendingProposalCount}
    />
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add lib/config/navigation.ts app/(dashboard)/career-notes/
git commit -m "feat: add career notes page shell and navigation

커리어노트 대시보드 페이지 기본 구조:
- 네비게이션 메뉴에 '커리어노트' 항목 추가
- Server Component 페이지 + Suspense 로딩"
```

---

## Task 7: 카드 + 목록 컴포넌트

**Files:**
- Create: `components/career-notes/career-note-card.tsx`
- Create: `components/career-notes/career-note-list.tsx`
- Create: `components/career-notes/career-note-edit-dialog.tsx`

- [ ] **Step 1: CareerNoteCard 컴포넌트 작성**

`components/career-notes/career-note-card.tsx` — 기존 InsightCard 패턴 따름:
- 제목, 내용 요약 표시
- metadata 태그(역할, 성과, 느낀 점 등) 뱃지로 표시 (값이 있는 것만)
- 출처 대화 링크
- 수정/삭제 버튼 (hover 시 표시)

`/frontend-design` 스킬 사용하여 디자인.

- [ ] **Step 2: CareerNoteEditDialog 컴포넌트 작성**

`components/career-notes/career-note-edit-dialog.tsx` — 기존 InsightEditDialog 패턴 따름:
- title, content 입력 필드
- metadata 8개 필드 입력 (각각 선택적)
- PUT API 호출 후 토스트 알림

- [ ] **Step 3: CareerNoteList 컴포넌트 작성**

`components/career-notes/career-note-list.tsx` — 기존 InsightList 패턴 따름:
- 목록 렌더링 + 정렬 토글
- optimistic 삭제
- 편집 다이얼로그 연결
- 빈 상태 메시지

- [ ] **Step 4: 커밋**

```bash
git add components/career-notes/career-note-card.tsx components/career-notes/career-note-list.tsx components/career-notes/career-note-edit-dialog.tsx
git commit -m "feat: add career note card, list, and edit dialog components

커리어노트 UI 컴포넌트:
- CareerNoteCard: metadata 태그 뱃지, 출처 링크
- CareerNoteList: optimistic 삭제, 정렬 토글
- CareerNoteEditDialog: 8개 metadata 필드 편집 지원"
```

---

## Task 8: 병합 제안 UI 컴포넌트

**Files:**
- Create: `components/career-notes/merge-proposal-banner.tsx`
- Create: `components/career-notes/merge-proposal-dialog.tsx`

- [ ] **Step 1: MergeProposalBanner 컴포넌트 작성**

`components/career-notes/merge-proposal-banner.tsx`:
- 상단에 "N개의 병합 제안이 있습니다" 알림 배너
- 클릭 시 병합 제안 목록으로 이동 또는 다이얼로그 열기
- `pendingProposalCount`가 0이면 렌더링하지 않음

- [ ] **Step 2: MergeProposalDialog 컴포넌트 작성**

`components/career-notes/merge-proposal-dialog.tsx`:
- 기존 노트 (targetNote) vs 새 노트 (sourceNote) 비교 뷰
- AI 병합 제안 미리보기 (suggestedTitle, suggestedContent, suggestedMetadata)
- 승인/편집 후 승인/거부 버튼
- 편집 모드: suggestedTitle, suggestedContent, suggestedMetadata 수정 가능
- POST `/api/career-notes/merge-proposals/[id]/resolve` 호출

`/frontend-design` 스킬 사용하여 비교 뷰 디자인.

- [ ] **Step 3: CareerNoteList에 병합 제안 배너 통합**

`career-note-list.tsx`에 `MergeProposalBanner` 추가, 병합 제안 목록 조회 연동.

- [ ] **Step 4: 커밋**

```bash
git add components/career-notes/merge-proposal-banner.tsx components/career-notes/merge-proposal-dialog.tsx components/career-notes/career-note-list.tsx
git commit -m "feat: add merge proposal banner and dialog components

병합 제안 UI:
- MergeProposalBanner: 미처리 제안 수 알림
- MergeProposalDialog: 기존 노트 vs 새 노트 비교 + AI 제안 미리보기
- 승인/편집 후 승인/거부 플로우"
```

---

## Task 9: 채팅 UI 연동

**Files:**
- Modify: `components/cover-letters/cover-letter-chat.tsx`
- Modify: `components/interviews/interview-chat.tsx`

- [ ] **Step 1: 자소서 채팅에 커리어노트 추출 버튼 + 자동 추출 추가**

`cover-letter-chat.tsx`에 커리어노트 추출 핸들러 추가. 자소서 대화 완료 시 자동 추출 체크박스도 추가 (스펙: "자소서/면접 대화 종료 시 자동 트리거"):

```typescript
const handleExtractCareerNotes = useCallback(async () => {
  setIsExtractingCareerNotes(true)
  try {
    const res = await fetch("/api/career-notes/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "커리어노트 추출에 실패했습니다.")
    }
    const noteCount = data.notes?.length ?? 0
    const proposalCount = data.proposals?.length ?? 0
    toast.success(
      `커리어노트 ${noteCount}개 추출${proposalCount > 0 ? `, 병합 제안 ${proposalCount}개` : ""}`,
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "커리어노트 추출에 실패했습니다."
    toast.error(message)
  } finally {
    setIsExtractingCareerNotes(false)
  }
}, [conversationId])
```

기존 인사이트 추출 버튼 옆에 커리어노트 추출 버튼 추가 (아이콘: `BookOpen`).

> **스펙 의도적 차이:** 스펙은 "인사이트 버튼 → 커리어노트 버튼으로 교체"이지만, 인사이트 마이그레이션이 이번 스코프 밖이므로 두 버튼이 일시적으로 공존. 마이그레이션 완료 시 인사이트 버튼 제거.

- [ ] **Step 2: 면접 채팅에 커리어노트 추출 버튼 + 자동 추출 추가**

`interview-chat.tsx`에 동일한 추출 핸들러 추가. 자동 추출 체크박스 추가:

```typescript
<div className="flex items-center space-x-2 mt-2">
  <Checkbox
    id="extract-career-notes"
    checked={extractCareerNotesOnComplete}
    onCheckedChange={(checked) =>
      setExtractCareerNotesOnComplete(checked === true)
    }
  />
  <label htmlFor="extract-career-notes" className="text-sm">
    면접 종료 후 커리어노트 자동 추출
  </label>
</div>
```

`handleComplete`에서 `extractCareerNotesOnComplete`가 true이면 추출 실행.

- [ ] **Step 3: 커밋**

```bash
git add components/cover-letters/cover-letter-chat.tsx components/interviews/interview-chat.tsx
git commit -m "feat: add career note extraction to chat UIs

자소서/면접 채팅에서 커리어노트 추출:
- 수동 추출 버튼 (BookOpen 아이콘)
- 면접 종료 시 자동 추출 체크박스
- 추출 결과 토스트 알림 (노트 N개, 병합 제안 M개)"
```

---

## PR 체크리스트

각 PR 생성 전 확인:

- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] 테스트 통과 (`npx vitest run`)
- [ ] `/docs-sync` 실행하여 문서 동기화
- [ ] PR base 브랜치: `develop`
