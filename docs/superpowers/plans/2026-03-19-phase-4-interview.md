# Phase 4: AI 모의면접 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 선택한 문서만 참고하는 AI 면접관과 텍스트 채팅 모의면접을 진행할 수 있는 기능을 구현한다.

**Architecture:** Phase 3(자기소개서)와 동일한 패턴 — 서비스 레이어(`lib/interviews/service.ts`) + API 라우트 + 클라이언트 컴포넌트. 핵심 차이는 에디터 없이 전체화면 채팅 인터페이스이며, `limitToDocumentIds`로 선택 문서만 RAG 검색 범위에 격리한다.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), AI SDK v6 (`useChat`, `DefaultChatTransport`, `streamText`, `toUIMessageStreamResponse`), Zod, shadcn/ui, Vitest

---

## 파일 맵

### 신규 생성

| 파일 | 역할 |
|------|------|
| `lib/validations/interview.ts` | Zod 스키마 (create, update, chat) |
| `lib/interviews/service.ts` | CRUD 서비스 레이어 + 커스텀 에러 클래스 |
| `app/api/interviews/route.ts` | POST /api/interviews |
| `app/api/interviews/[id]/route.ts` | GET, PUT, DELETE /api/interviews/[id] |
| `app/api/chat/interview/route.ts` | POST /api/chat/interview (스트리밍) |
| `components/interviews/interview-card.tsx` | 목록 카드 (제목, 기업/직무, 상태, 문서 수) |
| `components/interviews/interview-list-skeleton.tsx` | 목록 로딩 스켈레톤 |
| `components/interviews/interview-list.tsx` | 카드 그리드 + optimistic delete |
| `components/interviews/interview-form.tsx` | 면접 생성 폼 (문서 다중 선택) |
| `components/interviews/interview-chat.tsx` | 전체화면 채팅 인터페이스 |
| `app/(dashboard)/interviews/page.tsx` | 목록 페이지 (RSC) |
| `app/(dashboard)/interviews/new/page.tsx` | 생성 페이지 |
| `app/(dashboard)/interviews/[id]/page.tsx` | 채팅 작업공간 페이지 (RSC) |

### 테스트

| 파일 | 대상 |
|------|------|
| `tests/lib/validations/interview.test.ts` | Zod 스키마 검증 |
| `tests/lib/interviews/service.test.ts` | 서비스 레이어 |
| `tests/app/api/interviews/route.test.ts` | POST /api/interviews |
| `tests/app/api/chat/interview/route.test.ts` | POST /api/chat/interview |

### 수정 없음

DB 스키마(`InterviewSession`, `InterviewDocument`), 네비게이션(`/interviews`), AI 프롬프트(`buildInterviewSystemPrompt`), 공용 채팅 컴포넌트(`components/chat/`) 모두 이미 구현됨.

---

## 스펙 대비 의도적 차이

구현 전 `docs/references/spec-deviations.md`를 읽어 기존 패턴을 파악하고, 아래 차이는 동일 문서에 추가 기록한다:

- **`toDataStreamResponse` → `toUIMessageStreamResponse`**: 스펙 코드 예시는 `toDataStreamResponse`를 사용하나, AI SDK v6에서는 UIMessage 기반 응답인 `toUIMessageStreamResponse`를 사용한다 (Phase 3와 동일).
- **메시지 저장 위치**: 스펙은 user 메시지를 스트리밍 전에 저장하나, Phase 3 패턴대로 `onFinish` 콜백에서 user + assistant 메시지를 `$transaction`으로 원자적 저장한다.

---

## Task 1: 유효성 검증 스키마

**Files:**
- Create: `lib/validations/interview.ts`
- Test: `tests/lib/validations/interview.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/lib/validations/interview.test.ts
import { describe, it, expect } from "vitest"
import {
  createInterviewSchema,
  updateInterviewSchema,
  interviewChatSchema,
} from "@/lib/validations/interview"

const VALID_UUID = "a0000000-0000-4000-8000-000000000001"

describe("createInterviewSchema", () => {
  it("필수 필드가 모두 있으면 통과해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "카카오 모의면접",
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(true)
  })

  it("title이 없으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("제목을 입력해주세요.")
  })

  it("documentIds가 비어있으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      documentIds: [],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("최소 1개의 문서를 선택해주세요.")
  })

  it("documentIds에 유효하지 않은 UUID가 있으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      documentIds: ["not-a-uuid"],
    })
    expect(result.success).toBe(false)
  })

  it("companyName, position은 선택 사항이어야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      companyName: "카카오",
      position: "백엔드 개발자",
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(true)
    expect(result.data?.companyName).toBe("카카오")
  })

  it("title이 100자를 초과하면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "a".repeat(101),
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(false)
  })
})

describe("updateInterviewSchema", () => {
  it("status: COMPLETED이면 통과해야 한다", () => {
    const result = updateInterviewSchema.safeParse({ status: "COMPLETED" })
    expect(result.success).toBe(true)
  })

  it("status: ACTIVE이면 실패해야 한다 (종료만 가능)", () => {
    const result = updateInterviewSchema.safeParse({ status: "ACTIVE" })
    expect(result.success).toBe(false)
  })
})

describe("interviewChatSchema", () => {
  it("필수 필드가 모두 있으면 통과해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [{ id: "m1", role: "user", content: "안녕하세요" }],
      conversationId: VALID_UUID,
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it("messages가 비어있으면 실패해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [],
      conversationId: VALID_UUID,
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

  it("conversationId가 UUID 형식이 아니면 실패해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [{ id: "m1", role: "user", content: "테스트" }],
      conversationId: "not-a-uuid",
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/validations/interview.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 스키마 구현**

```typescript
// lib/validations/interview.ts
import { z } from "zod"

export const createInterviewSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력해주세요.")
    .max(100, "제목은 100자 이하로 입력해주세요."),
  companyName: z
    .string()
    .max(100, "기업명은 100자 이하로 입력해주세요.")
    .optional(),
  position: z
    .string()
    .max(100, "직무는 100자 이하로 입력해주세요.")
    .optional(),
  documentIds: z
    .array(z.string().uuid())
    .min(1, "최소 1개의 문서를 선택해주세요."),
})

export const updateInterviewSchema = z.object({
  status: z.literal("COMPLETED"),
})

export const interviewChatSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string().optional().default(""),
        parts: z.array(z.any()).optional(),
      }),
    )
    .min(1, "메시지가 필요합니다."),
  conversationId: z.string().uuid("유효하지 않은 대화 ID입니다."),
  interviewSessionId: z.string().uuid("유효하지 않은 면접 세션 ID입니다."),
})
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/validations/interview.test.ts
```
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add lib/validations/interview.ts tests/lib/validations/interview.test.ts
git commit -m "feat(interviews): add Zod validation schemas"
```

---

## Task 2: 서비스 레이어

**Files:**
- Create: `lib/interviews/service.ts`
- Test: `tests/lib/interviews/service.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/lib/interviews/service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    interviewDocument: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    document: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import {
  createInterview,
  getInterview,
  listInterviews,
  completeInterview,
  deleteInterview,
  getConversationMessages,
  InterviewNotFoundError,
  InterviewForbiddenError,
} from "@/lib/interviews/service"

const mockPrisma = vi.mocked(prisma)

const USER_ID = "a0000000-0000-4000-8000-000000000001"
const SESSION_ID = "b0000000-0000-4000-8000-000000000001"
const DOC_ID = "c0000000-0000-4000-8000-000000000001"
const CONV_ID = "d0000000-0000-4000-8000-000000000001"

// ─────────────────────────────────────────────────────────────────────────────
describe("createInterview()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(1) },
        interviewSession: {
          create: vi.fn().mockResolvedValue({ id: SESSION_ID }),
        },
        interviewDocument: { createMany: vi.fn().mockResolvedValue({}) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })
  })

  it("InterviewSession, InterviewDocument, Conversation을 트랜잭션으로 생성해야 한다", async () => {
    const result = await createInterview(USER_ID, {
      title: "카카오 면접",
      documentIds: [DOC_ID],
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: SESSION_ID })
  })

  it("소유하지 않은 문서가 포함되면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(0) }, // 소유 문서 없음
        interviewSession: { create: vi.fn() },
        interviewDocument: { createMany: vi.fn() },
        conversation: { create: vi.fn() },
      }
      return fn(tx)
    })

    await expect(
      createInterview(USER_ID, { title: "테스트", documentIds: [DOC_ID] }),
    ).rejects.toThrow(InterviewForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getInterview()", () => {
  it("세션이 없으면 null을 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("다른 사용자의 세션이면 null을 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      userId: "other-user",
    } as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("소유자라면 세션을 반환해야 한다", async () => {
    const mockSession = { id: SESSION_ID, userId: USER_ID, conversations: [], interviewDocuments: [] }
    mockPrisma.interviewSession.findUnique.mockResolvedValue(mockSession as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toEqual(mockSession)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listInterviews()", () => {
  it("사용자의 세션 목록을 반환해야 한다", async () => {
    const mockList = [{ id: SESSION_ID, title: "면접1", _count: { interviewDocuments: 2 } }]
    mockPrisma.interviewSession.findMany.mockResolvedValue(mockList as never)
    const result = await listInterviews(USER_ID)
    expect(result).toEqual(mockList)
    expect(mockPrisma.interviewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("completeInterview()", () => {
  it("status를 COMPLETED로 변경해야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.interviewSession.findUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: "COMPLETED",
    } as never)

    const result = await completeInterview(SESSION_ID, USER_ID)
    expect(mockPrisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, userId: USER_ID },
      data: { status: "COMPLETED" },
    })
    expect(result).toMatchObject({ id: SESSION_ID, status: "COMPLETED" })
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })

  it("소유권이 없으면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue({ id: SESSION_ID } as never)

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewForbiddenError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteInterview()", () => {
  it("세션을 삭제해야 한다", async () => {
    mockPrisma.interviewSession.deleteMany.mockResolvedValue({ count: 1 })
    await expect(deleteInterview(SESSION_ID, USER_ID)).resolves.toBeUndefined()
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockPrisma.interviewSession.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)

    await expect(deleteInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getConversationMessages()", () => {
  it("다른 사용자의 대화면 null을 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      userId: "other-user",
    } as never)
    const result = await getConversationMessages(CONV_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("소유자라면 메시지 목록을 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({ userId: USER_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([
      { id: "m1", role: "USER", content: "안녕", createdAt: new Date() },
    ] as never)
    const result = await getConversationMessages(CONV_ID, USER_ID)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/interviews/service.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 서비스 레이어 구현**

```typescript
// lib/interviews/service.ts
import { prisma } from "@/lib/prisma"

export class InterviewNotFoundError extends Error {
  constructor() {
    super("면접 세션을 찾을 수 없습니다.")
  }
}

export class InterviewForbiddenError extends Error {
  constructor() {
    super("이 면접 세션에 대한 권한이 없습니다.")
  }
}

interface CreateInterviewData {
  title: string
  companyName?: string
  position?: string
  documentIds: string[]
}

// 면접 세션 생성: InterviewSession + InterviewDocument + Conversation 트랜잭션
export async function createInterview(userId: string, data: CreateInterviewData) {
  return prisma.$transaction(async (tx) => {
    const ownedCount = await tx.document.count({
      where: { id: { in: data.documentIds }, userId },
    })
    if (ownedCount !== data.documentIds.length) {
      throw new InterviewForbiddenError()
    }

    const session = await tx.interviewSession.create({
      data: {
        userId,
        title: data.title,
        companyName: data.companyName,
        position: data.position,
      },
      select: { id: true },
    })

    await tx.interviewDocument.createMany({
      data: data.documentIds.map((documentId) => ({
        interviewSessionId: session.id,
        documentId,
      })),
    })

    await tx.conversation.create({
      data: {
        userId,
        type: "INTERVIEW",
        interviewSessionId: session.id,
      },
    })

    return session
  })
}

// 면접 세션 상세 조회 (conversation, messages, documents 포함)
export async function getInterview(id: string, userId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id },
    include: {
      conversations: {
        where: { type: "INTERVIEW" },
        select: {
          id: true,
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        take: 1,
      },
      interviewDocuments: {
        select: {
          document: {
            select: { id: true, title: true, type: true },
          },
        },
      },
    },
  })

  if (!session) return null
  if (session.userId !== userId) return null

  return session
}

// 면접 세션 목록 조회 (문서 수 포함)
export async function listInterviews(userId: string) {
  return prisma.interviewSession.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      companyName: true,
      position: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { interviewDocuments: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
}

// 면접 종료 (status → COMPLETED)
export async function completeInterview(id: string, userId: string) {
  const result = await prisma.interviewSession.updateMany({
    where: { id, userId },
    data: { status: "COMPLETED" },
  })

  if (result.count === 0) {
    const exists = await prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InterviewNotFoundError()
    throw new InterviewForbiddenError()
  }

  return prisma.interviewSession.findUniqueOrThrow({
    where: { id },
    select: { id: true, status: true, updatedAt: true },
  })
}

// 면접 세션 삭제 (cascade)
export async function deleteInterview(id: string, userId: string) {
  const result = await prisma.interviewSession.deleteMany({
    where: { id, userId },
  })

  if (result.count === 0) {
    const exists = await prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InterviewNotFoundError()
    throw new InterviewForbiddenError()
  }
}

// 대화 메시지 조회 (소유권 검증 포함)
export async function getConversationMessages(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  })

  if (!conversation) return null
  if (conversation.userId !== userId) return null

  return prisma.message.findMany({
    where: { conversationId },
    select: { id: true, role: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/interviews/service.test.ts
```
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add lib/interviews/service.ts tests/lib/interviews/service.test.ts
git commit -m "feat(interviews): add service layer with CRUD operations"
```

---

## Task 3: POST /api/interviews

**Files:**
- Create: `app/api/interviews/route.ts`
- Test: `tests/app/api/interviews/route.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// tests/app/api/interviews/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/interviews/service", () => ({
  createInterview: vi.fn(),
  InterviewForbiddenError: class InterviewForbiddenError extends Error {
    constructor() {
      super("이 면접 세션에 대한 권한이 없습니다.")
    }
  },
}))

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))
vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
}))

import { POST } from "@/app/api/interviews/route"
import { createClient } from "@/lib/supabase/server"
import { createInterview, InterviewForbiddenError } from "@/lib/interviews/service"

const mockCreateClient = vi.mocked(createClient)
const mockCreateInterview = vi.mocked(createInterview)

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "c0000000-0000-4000-8000-000000000001"
const CREATED_SESSION_ID = "d0000000-0000-4000-8000-000000000001"

const VALID_BODY = {
  title: "카카오 모의면접",
  documentIds: [VALID_DOC_ID],
}

function makeSupabaseMock(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/interviews", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue(makeSupabaseMock({ id: VALID_USER_ID }) as never)
  mockCreateInterview.mockResolvedValue({ id: CREATED_SESSION_ID } as never)
})

describe("POST /api/interviews", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const response = await POST(makeRequest(VALID_BODY))
      expect(response.status).toBe(401)
    })
  })

  describe("요청 본문이 잘못됐을 때", () => {
    it("JSON 파싱 실패 시 400을 반환해야 한다", async () => {
      const req = new Request("http://localhost/api/interviews", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it("title이 없으면 400을 반환해야 한다", async () => {
      const response = await POST(makeRequest({ documentIds: [VALID_DOC_ID] }))
      expect(response.status).toBe(400)
    })

    it("documentIds가 비어있으면 400을 반환해야 한다", async () => {
      const response = await POST(makeRequest({ title: "테스트", documentIds: [] }))
      expect(response.status).toBe(400)
    })
  })

  describe("정상 요청일 때", () => {
    it("201과 생성된 세션 ID를 반환해야 한다", async () => {
      const response = await POST(makeRequest(VALID_BODY))
      const body = await response.json()
      expect(response.status).toBe(201)
      expect(body).toEqual({ id: CREATED_SESSION_ID })
    })

    it("createInterview를 올바른 인자로 호출해야 한다", async () => {
      await POST(makeRequest(VALID_BODY))
      expect(mockCreateInterview).toHaveBeenCalledWith(VALID_USER_ID, {
        title: VALID_BODY.title,
        documentIds: VALID_BODY.documentIds,
      })
    })
  })

  describe("서비스 에러일 때", () => {
    it("InterviewForbiddenError이면 403을 반환해야 한다", async () => {
      mockCreateInterview.mockRejectedValue(new InterviewForbiddenError())
      const response = await POST(makeRequest(VALID_BODY))
      expect(response.status).toBe(403)
    })
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/app/api/interviews/route.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 라우트 구현**

```typescript
// app/api/interviews/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createInterviewSchema } from "@/lib/validations/interview"
import { createInterview, InterviewForbiddenError } from "@/lib/interviews/service"

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
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = createInterviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await createInterview(user.id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof InterviewForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/interviews]", error)
    return NextResponse.json(
      { error: "면접 세션 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/app/api/interviews/route.test.ts
```
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add app/api/interviews/route.ts tests/app/api/interviews/route.test.ts
git commit -m "feat(interviews): add POST /api/interviews route"
```

---

## Task 4: GET/PUT/DELETE /api/interviews/[id]

**Files:**
- Create: `app/api/interviews/[id]/route.ts`

서비스 레이어 테스트가 핵심 로직을 커버하므로 route-level 테스트는 작성하지 않는다 (Phase 3와 동일한 결정).

- [ ] **Step 1: 라우트 구현**

```typescript
// app/api/interviews/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateInterviewSchema } from "@/lib/validations/interview"
import {
  getInterview,
  completeInterview,
  deleteInterview,
  InterviewNotFoundError,
  InterviewForbiddenError,
} from "@/lib/interviews/service"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
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
      { error: "잘못된 면접 세션 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const session = await getInterview(id, user.id)

    if (!session) {
      return NextResponse.json(
        { error: "면접 세션을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("[GET /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션을 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function PUT(
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
      { error: "잘못된 면접 세션 ID 형식입니다." },
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

  const parsed = updateInterviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await completeInterview(id, user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof InterviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InterviewForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션 업데이트에 실패했습니다." },
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
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 면접 세션 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteInterview(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof InterviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InterviewForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/interviews/[id]/route.ts
git commit -m "feat(interviews): add GET/PUT/DELETE /api/interviews/[id] route"
```

---

## Task 5: POST /api/chat/interview (스트리밍)

**Files:**
- Create: `app/api/chat/interview/route.ts`
- Test: `tests/app/api/chat/interview/route.test.ts`

- [ ] **Step 1: 테스트 파일 작성** (인증 + 세션 소유권 검증에 집중)

```typescript
// tests/app/api/chat/interview/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findUnique: vi.fn() },
    interviewDocument: { findMany: vi.fn() },
    conversation: { findUnique: vi.fn() },
    message: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class AiSettingsNotFoundError extends Error {
    constructor(message = "AI 설정을 찾을 수 없습니다.") {
      super(message)
    }
  },
}))

vi.mock("@/lib/ai/context", () => ({
  buildContext: vi.fn(),
}))

vi.mock("@/lib/ai/prompts/interview", () => ({
  buildInterviewSystemPrompt: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
}))

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))

import { POST } from "@/app/api/chat/interview/route"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { streamText, convertToModelMessages } from "ai"

const mockCreateClient = vi.mocked(createClient)
const mockPrisma = vi.mocked(prisma)
const mockGetLanguageModel = vi.mocked(getLanguageModel)
const mockBuildContext = vi.mocked(buildContext)
const mockStreamText = vi.mocked(streamText)
const mockConvertToModelMessages = vi.mocked(convertToModelMessages)

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_SESSION_ID = "b0000000-0000-4000-8000-000000000001"
const VALID_CONV_ID = "c0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "d0000000-0000-4000-8000-000000000001"

const MOCK_SESSION = {
  userId: VALID_USER_ID,
  companyName: "카카오",
  position: "백엔드",
}

const VALID_BODY = {
  messages: [{ id: "m1", role: "user", content: "면접을 시작합니다." }],
  conversationId: VALID_CONV_ID,
  interviewSessionId: VALID_SESSION_ID,
}

function makeSupabaseMock(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat/interview", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const mockStreamResponse = { toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("ok")) }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue(makeSupabaseMock({ id: VALID_USER_ID }) as never)
  mockPrisma.interviewSession.findUnique.mockResolvedValue(MOCK_SESSION as never)
  mockPrisma.interviewDocument.findMany.mockResolvedValue([
    { documentId: VALID_DOC_ID },
  ] as never)
  mockPrisma.conversation.findUnique.mockResolvedValue({
    userId: VALID_USER_ID,
    interviewSessionId: VALID_SESSION_ID,
  } as never)
  mockBuildContext.mockResolvedValue("context text")
  mockGetLanguageModel.mockResolvedValue({} as never)
  mockConvertToModelMessages.mockResolvedValue([])
  mockStreamText.mockReturnValue(mockStreamResponse as never)
})

describe("POST /api/chat/interview", () => {
  it("인증이 없으면 401을 반환해야 한다", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(401)
  })

  it("세션이 없거나 소유권이 없으면 404를 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(404)
  })

  it("conversation 소유권이 없으면 404를 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      userId: "other-user",
      interviewSessionId: VALID_SESSION_ID,
    } as never)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(404)
  })

  it("정상 요청이면 streamText를 호출해야 한다", async () => {
    await POST(makeRequest(VALID_BODY))
    expect(mockStreamText).toHaveBeenCalledOnce()
  })

  it("buildContext를 limitToDocumentIds와 함께 호출해야 한다", async () => {
    await POST(makeRequest(VALID_BODY))
    expect(mockBuildContext).toHaveBeenCalledWith(
      VALID_USER_ID,
      expect.objectContaining({ limitToDocumentIds: [VALID_DOC_ID] }),
    )
  })

  it("AiSettingsNotFoundError이면 400을 반환해야 한다", async () => {
    mockGetLanguageModel.mockRejectedValue(new AiSettingsNotFoundError())
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/app/api/chat/interview/route.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 채팅 라우트 구현**

```typescript
// app/api/chat/interview/route.ts
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { MessageRole } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview"
import { interviewChatSchema } from "@/lib/validations/interview"

export const maxDuration = 60

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
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = interviewChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  const { messages, conversationId, interviewSessionId } = parsed.data

  try {
    // InterviewSession 로드 (기업 정보)
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      select: { userId: true, companyName: true, position: true },
    })

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: "면접 세션을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // conversationId 소유권 + 세션 연결 검증
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, interviewSessionId: true },
    })

    if (
      !conversation ||
      conversation.userId !== user.id ||
      conversation.interviewSessionId !== interviewSessionId
    ) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // 허용된 문서 ID 목록 조회 (문서 격리 핵심)
    const allowedDocs = await prisma.interviewDocument.findMany({
      where: { interviewSessionId },
      select: { documentId: true },
    })
    const allowedDocIds = allowedDocs.map((d) => d.documentId)

    // 마지막 user 메시지 텍스트 추출
    const lastMessage = messages[messages.length - 1]
    const lastMessageContent =
      lastMessage.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("") ||
      lastMessage.content ||
      ""

    // RAG 컨텍스트 + 모델 병렬 로드 (limitToDocumentIds로 격리)
    const [context, model] = await Promise.all([
      buildContext(user.id, {
        query: lastMessageContent,
        limitToDocumentIds: allowedDocIds,
      }),
      getLanguageModel(user.id),
    ])

    const system = buildInterviewSystemPrompt({
      companyName: session.companyName ?? undefined,
      position: session.position ?? undefined,
      context,
    })

    const modelMessages = await convertToModelMessages(messages as UIMessage[])

    const result = streamText({
      model,
      system,
      messages: modelMessages,
      onFinish: async ({ text }) => {
        const ops = [
          ...(lastMessage.role === "user" && lastMessageContent
            ? [
                prisma.message.create({
                  data: {
                    conversationId,
                    role: MessageRole.USER,
                    content: lastMessageContent,
                  },
                }),
              ]
            : []),
          ...(text
            ? [
                prisma.message.create({
                  data: {
                    conversationId,
                    role: MessageRole.ASSISTANT,
                    content: text,
                  },
                }),
              ]
            : []),
        ]
        if (ops.length > 0) {
          await prisma.$transaction(ops)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/chat/interview]", error)
    return NextResponse.json(
      { error: "채팅 응답 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/app/api/chat/interview/route.test.ts
```
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add app/api/chat/interview/route.ts tests/app/api/chat/interview/route.test.ts
git commit -m "feat(interviews): add POST /api/chat/interview streaming route"
```

---

## Task 6: UI 컴포넌트

**Files:**
- Create: `components/interviews/interview-card.tsx`
- Create: `components/interviews/interview-list-skeleton.tsx`
- Create: `components/interviews/interview-list.tsx`
- Create: `components/interviews/interview-form.tsx`
- Create: `components/interviews/interview-chat.tsx`

UI 컴포넌트는 Phase 3(`components/cover-letters/`) 패턴을 그대로 따른다. 핵심 차이만 아래에 명시한다.

- [ ] **Step 1: interview-card.tsx 구현**

```typescript
// components/interviews/interview-card.tsx
"use client"

import { FileText, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface InterviewCardProps {
  id: string
  title: string
  companyName?: string | null
  position?: string | null
  status: string
  documentCount: number
  updatedAt: string
  isDeleting: boolean
  onDelete: (id: string) => void
}

export function InterviewCard({
  id,
  title,
  companyName,
  position,
  status,
  documentCount,
  updatedAt,
  isDeleting,
  onDelete,
}: InterviewCardProps) {
  const isCompleted = status === "COMPLETED"

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm",
        isDeleting && "pointer-events-none opacity-50",
      )}
    >
      <a href={`/interviews/${id}`} className="absolute inset-0" aria-label={title} />

      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold leading-tight">{title}</h3>
        <Badge variant={isCompleted ? "secondary" : "default"} className="shrink-0">
          {isCompleted ? "종료됨" : "진행중"}
        </Badge>
      </div>

      {(companyName || position) && (
        <p className="mb-3 text-sm text-muted-foreground">
          {[companyName, position].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {documentCount}개 문서
        </span>
        <span>{format(new Date(updatedAt), "yyyy.MM.dd", { locale: ko })}</span>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="삭제"
            onClick={(e) => e.preventDefault()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>면접 세션을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 면접 기록이 모두 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(id)}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: interview-list-skeleton.tsx 구현**

```typescript
// components/interviews/interview-list-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function InterviewListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="mb-3 h-4 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: interview-list.tsx 구현**

```typescript
// components/interviews/interview-list.tsx
"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { InterviewCard } from "@/components/interviews/interview-card"

interface InterviewItem {
  id: string
  title: string
  companyName: string | null
  position: string | null
  status: string
  documentCount: number
  updatedAt: string
}

interface InterviewListProps {
  interviews: InterviewItem[]
}

export function InterviewList({ interviews }: InterviewListProps) {
  const router = useRouter()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [optimisticList, removeOptimistic] = useOptimistic(
    interviews,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))
      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("면접 세션이 삭제되었습니다.")
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "삭제에 실패했습니다."
        toast.error(message)
        router.refresh()
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [removeOptimistic, router],
  )

  if (optimisticList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">아직 진행한 모의면접이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {optimisticList.map((item) => (
        <InterviewCard
          key={item.id}
          {...item}
          isDeleting={deletingIds.has(item.id)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: interview-form.tsx 구현**

```typescript
// components/interviews/interview-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface DocumentItem {
  id: string
  title: string
  type: string
}

interface InterviewFormProps {
  documents: DocumentItem[]
}

export function InterviewForm({ documents }: InterviewFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [position, setPosition] = useState("")
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "제목을 입력해주세요."
    if (selectedDocIds.length === 0)
      newErrors.documentIds = "최소 1개의 문서를 선택해주세요."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName: companyName.trim() || undefined,
          position: position.trim() || undefined,
          documentIds: selectedDocIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "생성에 실패했습니다.")
      }

      router.push(`/interviews/${data.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "생성에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 카카오 백엔드 모의면접"
          maxLength={100}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">기업명 (선택)</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="카카오"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">직무 (선택)</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="백엔드 개발자"
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>
            참고 문서 <span className="text-destructive">*</span>
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            면접관은 선택한 문서만 참고합니다.
          </p>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            업로드된 문서가 없습니다. 먼저 참고자료를 업로드해주세요.
          </p>
        ) : (
          <div className="space-y-2 rounded-lg border p-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3">
                <Checkbox
                  id={doc.id}
                  checked={selectedDocIds.includes(doc.id)}
                  onCheckedChange={() => toggleDoc(doc.id)}
                />
                <label
                  htmlFor={doc.id}
                  className="flex flex-1 cursor-pointer items-center gap-2 text-sm"
                >
                  <span className="flex-1">{doc.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {doc.type}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        )}

        {errors.documentIds && (
          <p className="text-sm text-destructive">{errors.documentIds}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "생성 중..." : "면접 시작하기"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: interview-chat.tsx 구현**

핵심 차이점:
- `useEffect`로 메시지 없을 때 "면접을 시작합니다." 자동 전송
- 면접 종료 버튼 + 확인 다이얼로그 → `PUT /api/interviews/[id]` 호출
- 종료된 면접 읽기 전용

```typescript
// components/interviews/interview-chat.tsx
"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Square } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useChatScroll } from "@/hooks/use-chat-scroll"
import { ChatMessage, ChatInput, ChatLoading } from "@/components/chat"

interface InterviewChatProps {
  sessionId: string
  conversationId: string
  title: string
  companyName?: string | null
  position?: string | null
  initialMessages: UIMessage[]
  isCompleted: boolean
}

export function InterviewChat({
  sessionId,
  conversationId,
  title,
  companyName,
  position,
  initialMessages,
  isCompleted,
}: InterviewChatProps) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)
  const hasSentInitialRef = useRef(false)
  const [input, setInput] = useState("")

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/interview",
        body: () => ({ conversationId, interviewSessionId: sessionId }),
      }),
    [conversationId, sessionId],
  )

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "응답 생성에 실패했습니다.")
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  // 메시지가 없으면 면접 시작 메시지 자동 전송
  useEffect(() => {
    if (hasSentInitialRef.current) return
    if (initialMessages.length > 0) return
    if (completed) return
    hasSentInitialRef.current = true
    sendMessage({ role: "user", content: "면접을 시작합니다." })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { containerRef, scrollToBottom, showScrollButton } = useChatScroll(messages)

  const handleSend = () => {
    if (!input.trim() || isLoading || completed) return
    sendMessage({ role: "user", content: input.trim() })
    setInput("")
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/interviews/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "종료에 실패했습니다.")
      }

      setCompleted(true)
      toast.success("면접이 종료되었습니다.")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "종료에 실패했습니다."
      toast.error(message)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <Badge variant={completed ? "secondary" : "default"}>
              {completed ? "종료됨" : "진행중"}
            </Badge>
          </div>
          {(companyName || position) && (
            <p className="text-sm text-muted-foreground">
              {[companyName, position].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {!completed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isCompleting}>
                <Square className="mr-2 h-3.5 w-3.5" />
                면접 종료
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>면접을 종료하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  종료 후에는 채팅을 계속할 수 없습니다. 면접 기록은 유지됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>종료</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* 채팅 영역 */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && <ChatLoading />}
        </div>
      </div>

      {/* 스크롤 버튼 */}
      {showScrollButton && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button size="sm" variant="outline" onClick={scrollToBottom}>
            아래로
          </Button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {completed ? (
            <p className="text-center text-sm text-muted-foreground">
              종료된 면접입니다. 새 면접을 시작하려면 목록으로 돌아가세요.
            </p>
          ) : (
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={isLoading}
              placeholder="답변을 입력하세요..."
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 커밋**

```bash
git add components/interviews/
git commit -m "feat(interviews): add UI components (card, list, form, chat)"
```

---

## Task 7: 페이지

**Files:**
- Create: `app/(dashboard)/interviews/page.tsx`
- Create: `app/(dashboard)/interviews/new/page.tsx`
- Create: `app/(dashboard)/interviews/[id]/page.tsx`

- [ ] **Step 1: 목록 페이지 구현**

```typescript
// app/(dashboard)/interviews/page.tsx
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { listInterviews } from "@/lib/interviews/service"
import { InterviewList } from "@/components/interviews/interview-list"
import { InterviewListSkeleton } from "@/components/interviews/interview-list-skeleton"
import { Button } from "@/components/ui/button"

async function InterviewListSection({ userId }: { userId: string }) {
  const sessions = await listInterviews(userId)

  const serialized = sessions.map((s) => ({
    ...s,
    documentCount: s._count.interviewDocuments,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <InterviewList interviews={serialized} />
}

export default async function InterviewsPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">모의면접</h1>
          <p className="text-muted-foreground mt-1">
            AI 면접관과 실전처럼 면접을 연습합니다
          </p>
        </div>
        <Button asChild>
          <Link href="/interviews/new">
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            새 모의면접
          </Link>
        </Button>
      </div>

      <Suspense fallback={<InterviewListSkeleton />}>
        <InterviewListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 2: 생성 페이지 구현**

```typescript
// app/(dashboard)/interviews/new/page.tsx
import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { listDocuments } from "@/lib/documents/service"
import { InterviewForm } from "@/components/interviews/interview-form"

export default async function NewInterviewPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const documents = await listDocuments(user.id)
  const serializedDocs = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">새 모의면접</h1>
        <p className="text-muted-foreground mt-1">
          면접 정보와 참고할 문서를 선택하세요
        </p>
      </div>
      <InterviewForm documents={serializedDocs} />
    </div>
  )
}
```

- [ ] **Step 3: 채팅 작업공간 페이지 구현**

```typescript
// app/(dashboard)/interviews/[id]/page.tsx
import { notFound, redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { getAuthUser } from "@/lib/supabase/user"
import { getInterview } from "@/lib/interviews/service"
import { InterviewChat } from "@/components/interviews/interview-chat"

function toUIMessages(
  messages: { id: string; role: string; content: string }[],
): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}

export default async function InterviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { id } = await params
  const session = await getInterview(id, user.id)

  if (!session) notFound()

  const conversation = session.conversations[0]
  if (!conversation) notFound()

  const initialMessages = toUIMessages(conversation.messages)

  return (
    // -m-6으로 부모 p-6 padding 상쇄, 전체화면 채팅
    <div className="relative -m-6 h-[calc(100%+theme(spacing.12))]">
      <InterviewChat
        sessionId={session.id}
        conversationId={conversation.id}
        title={session.title}
        companyName={session.companyName}
        position={session.position}
        initialMessages={initialMessages}
        isCompleted={session.status === "COMPLETED"}
      />
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/(dashboard)/interviews/
git commit -m "feat(interviews): add list, new, and workspace pages"
```

---

## Task 8: 마무리 점검

- [ ] **Step 1: typecheck + lint 확인**

```bash
npm run typecheck && npm run lint
```
Expected: 에러 없음. 타입 에러가 있으면 수정 후 재확인.

- [ ] **Step 2: 전체 테스트 실행**

```bash
npx vitest run tests/lib/validations/interview.test.ts tests/lib/interviews/service.test.ts tests/app/api/interviews/route.test.ts tests/app/api/chat/interview/route.test.ts
```
Expected: 전체 PASS

- [ ] **Step 3: spec-deviations.md 업데이트**

`docs/references/spec-deviations.md`를 열어 Phase 4에서 발생한 의도적 차이 2건 추가:
- `toDataStreamResponse → toUIMessageStreamResponse` (AI SDK v6 UIMessage 기반)
- 메시지 저장 위치: onFinish 콜백 내 $transaction (스펙은 스트리밍 전 user 메시지 저장)

```bash
git add docs/references/spec-deviations.md
git commit -m "docs: add Phase 4 spec deviations"
```

- [ ] **Step 4: 기능 문서 작성**

`docs/features/07-interviews.md` 작성 (Phase 3 `06-cover-letters.md` 포맷 참고). 주요 섹션: 개요, 핵심 흐름, 데이터 구조, API, 채팅 인터페이스, 문서 격리, 서비스 레이어, 검증 스키마, 파일 구조.

```bash
git add docs/features/07-interviews.md
git commit -m "docs(interviews): add feature documentation"
```

---

## 검증 체크리스트 (스펙 기준)

- [ ] 새 면접 생성 → 문서 2개 선택 → 면접 채팅 화면 진입
- [ ] AI 면접관이 먼저 인사하며 첫 질문을 던지는지 확인
- [ ] AI가 선택한 문서 기반으로 질문하는지 확인
- [ ] **선택하지 않은 문서의 내용이 답변에 포함되지 않는지 확인 (핵심)**
- [ ] 면접 종료 → 상태 변경 (COMPLETED) + 입력 비활성화 확인
- [ ] 목록 페이지에서 상태 배지 (진행중/종료됨) 확인
- [ ] 목록에서 삭제 → optimistic 제거 확인
- [ ] 기존 면접 재진입 시 이전 대화 내역 복원 확인
