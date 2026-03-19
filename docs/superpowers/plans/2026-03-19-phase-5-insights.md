# Phase 5: 인사이트 추출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자기소개서/면접 대화에서 인사이트를 자동 추출하여 관리하고 AI 컨텍스트에 반영하는 기능 구현

**Architecture:** Validation 스키마 + 서비스 레이어 → API Routes → 채팅 UI 추출 버튼 → 대시보드 페이지/컴포넌트 순서로 구현. 기존 interviews/cover-letters 패턴(서비스 레이어 분리, updateMany 소유권, 낙관적 삭제)을 그대로 따름.

**Tech Stack:** Next.js App Router, Prisma, Zod, ai SDK (`generateObject`), shadcn/ui, class-variance-authority

**Design Spec:** `docs/superpowers/specs/2026-03-19-phase-5-insights-design.md`

---

## File Map

```
신규:
  lib/validations/insight.ts          — Zod 스키마 (extract, update)
  lib/insights/service.ts             — 서비스 레이어 (extract, list, update, delete, countByCategory)
  app/api/insights/extract/route.ts   — POST 추출 API
  app/api/insights/[id]/route.ts      — PUT/DELETE CRUD API
  app/(dashboard)/insights/page.tsx   — 대시보드 Server Component
  components/insights/insight-list.tsx — 목록 Client Component (탭 필터 + 정렬 + 낙관적 삭제)
  components/insights/insight-card.tsx — 카드 컴포넌트 (배지 + 출처 + 수정/삭제)
  components/insights/insight-edit-dialog.tsx — 편집 다이얼로그

수정:
  components/cover-letters/cover-letter-chat.tsx  — 헤더에 Lightbulb 추출 버튼
  components/interviews/interview-chat.tsx        — 헤더에 추출 버튼 + 종료 다이얼로그 체크박스
  app/api/chat/interview/route.ts                 — buildContext에 includeInsights: true 추가
```

---

## Task 1: Validation 스키마

**Files:**
- Create: `lib/validations/insight.ts`
- Test: `tests/lib/validations/insight.test.ts`
- Reference: `lib/validations/interview.ts` (패턴 참조)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/validations/insight.test.ts
import { describe, expect, it } from "vitest"
import { extractInsightsSchema, updateInsightSchema } from "@/lib/validations/insight"

describe("extractInsightsSchema", () => {
  it("accepts valid conversationId", () => {
    const result = extractInsightsSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-UUID conversationId", () => {
    const result = extractInsightsSchema.safeParse({ conversationId: "not-uuid" })
    expect(result.success).toBe(false)
  })

  it("rejects missing conversationId", () => {
    const result = extractInsightsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("updateInsightSchema", () => {
  it("accepts valid data", () => {
    const result = updateInsightSchema.safeParse({
      title: "강점 제목",
      content: "구체적인 내용",
      category: "strength",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty title", () => {
    const result = updateInsightSchema.safeParse({
      title: "",
      content: "내용",
      category: "strength",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid category", () => {
    const result = updateInsightSchema.safeParse({
      title: "제목",
      content: "내용",
      category: "invalid",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid categories", () => {
    const categories = ["strength", "experience", "motivation", "skill", "other"]
    for (const category of categories) {
      const result = updateInsightSchema.safeParse({
        title: "제목",
        content: "내용",
        category,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects title over 200 chars", () => {
    const result = updateInsightSchema.safeParse({
      title: "a".repeat(201),
      content: "내용",
      category: "strength",
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/validations/insight.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// lib/validations/insight.ts
import { z } from "zod"
import { INSIGHT_CATEGORIES } from "@/lib/ai/prompts/insight-extraction"

export const extractInsightsSchema = z.object({
  conversationId: z.string().uuid("올바른 대화 ID 형식이 아닙니다."),
})

export const updateInsightSchema = z.object({
  title: z.string({ error: "제목을 입력해주세요." }).min(1).max(200),
  content: z.string({ error: "내용을 입력해주세요." }).min(1),
  category: z.enum(INSIGHT_CATEGORIES, {
    error: "올바른 카테고리를 선택해주세요.",
  }),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/validations/insight.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/validations/insight.ts tests/lib/validations/insight.test.ts
git commit -m "feat(insights): add validation schemas for extract and update"
```

---

## Task 2: 서비스 레이어

**Files:**
- Create: `lib/insights/service.ts`
- Test: `tests/lib/insights/service.test.ts`
- Reference: `lib/interviews/service.ts` (패턴 참조), `lib/ai/provider.ts` (AiSettingsNotFoundError)

- [ ] **Step 1: Write the failing test**

서비스 레이어 테스트는 Prisma를 모킹한다. 기존 `tests/lib/interviews/service.test.ts` 패턴을 따른다.

```typescript
// tests/lib/insights/service.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: { findFirst: vi.fn() },
    message: { findMany: vi.fn() },
    insight: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock AI provider
vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class extends Error {
    constructor() { super("AI 설정이 완료되지 않았습니다.") }
  },
}))

// Mock generateObject
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import {
  listInsights,
  updateInsight,
  deleteInsight,
  countByCategory,
  InsightNotFoundError,
  InsightForbiddenError,
} from "@/lib/insights/service"

const userId = "user-1"
const insightId = "insight-1"

describe("extractInsights", () => {
  it("throws InsightNotFoundError when conversation not found", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null)

    const { extractInsights } = await import("@/lib/insights/service")
    await expect(
      extractInsights(userId, "conv-1"),
    ).rejects.toThrow(InsightNotFoundError)
  })

  it("returns empty array when no messages", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: "conv-1" } as never)
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const { extractInsights } = await import("@/lib/insights/service")
    const result = await extractInsights(userId, "conv-1")
    expect(result).toEqual([])
  })
})

describe("listInsights", () => {
  it("returns insights for user", async () => {
    const mockInsights = [{ id: "1", title: "test", category: "strength" }]
    vi.mocked(prisma.insight.findMany).mockResolvedValue(mockInsights as never)

    const result = await listInsights(userId)
    expect(result).toEqual(mockInsights)
    expect(prisma.insight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    )
  })

  it("filters by category", async () => {
    vi.mocked(prisma.insight.findMany).mockResolvedValue([] as never)

    await listInsights(userId, "strength")
    expect(prisma.insight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, category: "strength" } }),
    )
  })
})

describe("updateInsight", () => {
  it("updates with ownership check", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 1 } as never)

    await updateInsight(userId, insightId, {
      title: "updated",
      content: "updated content",
      category: "skill",
    })
    expect(prisma.insight.updateMany).toHaveBeenCalledWith({
      where: { id: insightId, userId },
      data: { title: "updated", content: "updated content", category: "skill" },
    })
  })

  it("throws NotFoundError when insight does not exist", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue(null)

    await expect(
      updateInsight(userId, insightId, { title: "t", content: "c", category: "skill" }),
    ).rejects.toThrow(InsightNotFoundError)
  })

  it("throws ForbiddenError when not owned", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue({ id: insightId } as never)

    await expect(
      updateInsight(userId, insightId, { title: "t", content: "c", category: "skill" }),
    ).rejects.toThrow(InsightForbiddenError)
  })
})

describe("deleteInsight", () => {
  it("deletes with ownership check", async () => {
    vi.mocked(prisma.insight.deleteMany).mockResolvedValue({ count: 1 } as never)

    await deleteInsight(userId, insightId)
    expect(prisma.insight.deleteMany).toHaveBeenCalledWith({
      where: { id: insightId, userId },
    })
  })

  it("throws NotFoundError when not found", async () => {
    vi.mocked(prisma.insight.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue(null)

    await expect(deleteInsight(userId, insightId)).rejects.toThrow(InsightNotFoundError)
  })
})

describe("countByCategory", () => {
  it("returns grouped counts", async () => {
    vi.mocked(prisma.insight.groupBy).mockResolvedValue([
      { category: "strength", _count: { _all: 3 } },
      { category: "skill", _count: { _all: 2 } },
    ] as never)

    const result = await countByCategory(userId)
    expect(result).toEqual([
      { category: "strength", _count: { _all: 3 } },
      { category: "skill", _count: { _all: 2 } },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/insights/service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// lib/insights/service.ts
import { generateObject } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getLanguageModel } from "@/lib/ai/provider"
import {
  insightExtractionPrompt,
  INSIGHT_CATEGORIES,
} from "@/lib/ai/prompts/insight-extraction"

export class InsightNotFoundError extends Error {
  constructor() {
    super("인사이트를 찾을 수 없습니다.")
  }
}

export class InsightForbiddenError extends Error {
  constructor() {
    super("이 인사이트에 대한 권한이 없습니다.")
  }
}

const insightObjectSchema = z.object({
  insights: z.array(
    z.object({
      category: z.enum(INSIGHT_CATEGORIES),
      title: z.string(),
      content: z.string(),
    }),
  ),
})

export async function extractInsights(userId: string, conversationId: string) {
  // 1. 대화 조회 + userId 소유권 검증 (findFirst — 메시지 데이터 필요)
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) {
    throw new InsightNotFoundError()
  }

  // 2. 대화 메시지 로드
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  if (messages.length === 0) {
    return []
  }

  // 3. 기존 인사이트 삭제 (재추출)
  await prisma.insight.deleteMany({ where: { conversationId, userId } })

  // 4. generateObject로 구조화 추출
  const model = await getLanguageModel(userId)
  const { object } = await generateObject({
    model,
    schema: insightObjectSchema,
    system: insightExtractionPrompt,
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
  })

  // 5. $transaction으로 인사이트 일괄 생성
  const created = await prisma.$transaction(
    object.insights.map((insight) =>
      prisma.insight.create({
        data: {
          userId,
          conversationId,
          category: insight.category,
          title: insight.title,
          content: insight.content,
        },
      }),
    ),
  )

  return created
}

export async function listInsights(userId: string, category?: string) {
  return prisma.insight.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
    },
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
    orderBy: { createdAt: "desc" },
  })
}

interface UpdateInsightData {
  title: string
  content: string
  category: string
}

export async function updateInsight(
  userId: string,
  id: string,
  data: UpdateInsightData,
) {
  const result = await prisma.insight.updateMany({
    where: { id, userId },
    data: { title: data.title, content: data.content, category: data.category },
  })
  if (result.count === 0) {
    const exists = await prisma.insight.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InsightNotFoundError()
    throw new InsightForbiddenError()
  }
}

export async function deleteInsight(userId: string, id: string) {
  const result = await prisma.insight.deleteMany({
    where: { id, userId },
  })
  if (result.count === 0) {
    const exists = await prisma.insight.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InsightNotFoundError()
    throw new InsightForbiddenError()
  }
}

export async function countByCategory(userId: string) {
  return prisma.insight.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/insights/service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/insights/service.ts tests/lib/insights/service.test.ts
git commit -m "feat(insights): add service layer with extract, CRUD, and countByCategory"
```

---

## Task 3: 추출 API Route

**Files:**
- Create: `app/api/insights/extract/route.ts`
- Test: `tests/app/api/insights/extract/route.test.ts`
- Reference: `app/api/interviews/route.ts` (POST 패턴), `docs/references/decisions.md` (JSON 파싱 분리)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/app/api/insights/extract/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
  }),
}))

const mockExtract = vi.fn()
vi.mock("@/lib/insights/service", () => ({
  extractInsights: (...args: unknown[]) => mockExtract(...args),
  InsightNotFoundError: class extends Error {
    constructor() { super("not found") }
  },
  InsightForbiddenError: class extends Error {
    constructor() { super("forbidden") }
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  AiSettingsNotFoundError: class extends Error {
    constructor() { super("AI 설정이 완료되지 않았습니다.") }
  },
}))

import { POST } from "@/app/api/insights/extract/route"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"

describe("POST /api/insights/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns extracted insights on success", async () => {
    const mockInsights = [{ id: "1", title: "test", category: "strength" }]
    mockExtract.mockResolvedValue(mockInsights)

    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.insights).toEqual(mockInsights)
  })

  it("returns 400 for invalid body", async () => {
    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({ conversationId: "not-uuid" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: "not json",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for AiSettingsNotFoundError", async () => {
    mockExtract.mockRejectedValue(new AiSettingsNotFoundError())

    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/api/insights/extract/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// app/api/insights/extract/route.ts
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractInsightsSchema } from "@/lib/validations/insight"
import {
  extractInsights,
  InsightNotFoundError,
} from "@/lib/insights/service"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = extractInsightsSchema.safeParse(body)
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
    const insights = await extractInsights(user.id, parsed.data.conversationId)
    return NextResponse.json({ insights })
  } catch (error) {
    if (error instanceof InsightNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/insights/extract]", error)
    return NextResponse.json(
      { error: "인사이트 추출에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app/api/insights/extract/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/insights/extract/route.ts tests/app/api/insights/extract/route.test.ts
git commit -m "feat(insights): add POST /api/insights/extract route"
```

---

## Task 4: CRUD API Route (PUT/DELETE)

**Files:**
- Create: `app/api/insights/[id]/route.ts`
- Test: `tests/app/api/insights/[id]/route.test.ts`
- Reference: `app/api/interviews/[id]/route.ts` (UUID 검증, PUT/DELETE 패턴)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/app/api/insights/[id]/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
  }),
}))

const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock("@/lib/insights/service", () => ({
  updateInsight: (...args: unknown[]) => mockUpdate(...args),
  deleteInsight: (...args: unknown[]) => mockDelete(...args),
  InsightNotFoundError: class extends Error {
    constructor() { super("not found") }
  },
  InsightForbiddenError: class extends Error {
    constructor() { super("forbidden") }
  },
}))

import { PUT, DELETE } from "@/app/api/insights/[id]/route"

const validId = "550e8400-e29b-41d4-a716-446655440000"
const params = Promise.resolve({ id: validId })

describe("PUT /api/insights/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates insight on valid input", async () => {
    mockUpdate.mockResolvedValue(undefined)

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        title: "updated title",
        content: "updated content",
        category: "skill",
      }),
    })

    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith("user-1", validId, {
      title: "updated title",
      content: "updated content",
      category: "skill",
    })
  })

  it("returns 400 for invalid UUID", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "t", content: "c", category: "skill" }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "bad-id" }) })
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid body", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "", content: "c", category: "skill" }),
    })

    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/insights/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes insight on valid id", async () => {
    mockDelete.mockResolvedValue(undefined)

    const req = new Request("http://localhost", { method: "DELETE" })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
  })

  it("returns 400 for invalid UUID", async () => {
    const req = new Request("http://localhost", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "bad" }) })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/api/insights/\\[id\\]/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// app/api/insights/[id]/route.ts
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { updateInsightSchema } from "@/lib/validations/insight"
import {
  updateInsight,
  deleteInsight,
  InsightNotFoundError,
  InsightForbiddenError,
} from "@/lib/insights/service"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PUT(
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
      { error: "잘못된 인사이트 ID 형식입니다." },
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

  const parsed = updateInsightSchema.safeParse(body)
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
    await updateInsight(user.id, id, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof InsightNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InsightForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/insights/[id]]", error)
    return NextResponse.json(
      { error: "인사이트 수정에 실패했습니다." },
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
      { error: "잘못된 인사이트 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteInsight(user.id, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof InsightNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InsightForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/insights/[id]]", error)
    return NextResponse.json(
      { error: "인사이트 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app/api/insights/\\[id\\]/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/api/insights/[id]/route.ts" "tests/app/api/insights/[id]/route.test.ts"
git commit -m "feat(insights): add PUT/DELETE /api/insights/[id] routes"
```

---

## Task 5: 면접 채팅 includeInsights 추가

**Files:**
- Modify: `app/api/chat/interview/route.ts` — `buildContext` 호출에 `includeInsights: true` 추가

- [ ] **Step 1: Add includeInsights to buildContext call**

`app/api/chat/interview/route.ts`의 `buildContext` 호출을 찾아 옵션에 `includeInsights: true`를 추가한다:

```typescript
// 기존:
buildContext(user.id, {
  query: lastMessageContent,
  limitToDocumentIds: allowedDocIds,
})

// 변경:
buildContext(user.id, {
  query: lastMessageContent,
  limitToDocumentIds: allowedDocIds,
  includeInsights: true,
})
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/interview/route.ts
git commit -m "feat(insights): add includeInsights to interview chat context"
```

---

## Task 6: 자기소개서 채팅 — 인사이트 추출 버튼

**Files:**
- Modify: `components/cover-letters/cover-letter-chat.tsx` — 헤더에 Lightbulb 추출 버튼

- [ ] **Step 1: Add extract button to header**

`cover-letter-chat.tsx` 헤더 영역 우측에 추출 버튼 추가. 참고할 패턴: 기존 헤더의 문서 선택 Popover 옆에 배치.

필요한 상태/로직:
- `isExtracting` 로딩 상태
- `handleExtractInsights` 핸들러: `POST /api/insights/extract` 호출
- 기존 인사이트 존재 시 확인 다이얼로그 (AlertDialog)
- 성공 토스트

```typescript
// 추가할 imports
import { Lightbulb } from "lucide-react"
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

// 상태 추가
const [isExtracting, setIsExtracting] = useState(false)

// 핸들러 추가
const handleExtractInsights = useCallback(async () => {
  setIsExtracting(true)
  try {
    const res = await fetch("/api/insights/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "인사이트 추출에 실패했습니다.")
    }
    toast.success(`${data.insights.length}개의 인사이트가 추출되었습니다.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "인사이트 추출에 실패했습니다."
    toast.error(message)
  } finally {
    setIsExtracting(false)
  }
}, [conversationId])

// 헤더에 버튼 추가 (문서 선택 Popover 옆)
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      disabled={isExtracting || messages.length === 0}
      aria-label="인사이트 추출"
    >
      {isExtracting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Lightbulb className="h-4 w-4" />
      )}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>인사이트 추출</AlertDialogTitle>
      <AlertDialogDescription>
        이 대화에서 인사이트를 추출합니다. 이미 추출된 인사이트가 있으면 수동 편집 내용을 포함하여 모두 삭제 후 다시 추출됩니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleExtractInsights}>
        추출하기
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 2: Commit**

```bash
git add components/cover-letters/cover-letter-chat.tsx
git commit -m "feat(insights): add extract button to cover-letter chat header"
```

---

## Task 7: 면접 채팅 — 인사이트 추출 버튼 + 종료 다이얼로그 체크박스

**Files:**
- Modify: `components/interviews/interview-chat.tsx` — 헤더에 추출 버튼 + 종료 다이얼로그에 체크박스

- [ ] **Step 1: Add extract button to header**

Task 6과 동일한 패턴으로 헤더 우측에 `Lightbulb` 버튼 추가. "면접 종료" 버튼 왼쪽에 배치.

- [ ] **Step 2: Add auto-extract checkbox to end dialog**

종료 AlertDialog 내부에 체크박스 추가:

```typescript
// 상태 추가
const [extractOnComplete, setExtractOnComplete] = useState(true)

// AlertDialog 내 Description 아래에 추가
<div className="flex items-center space-x-2 mt-4">
  <Checkbox
    id="extract-insights"
    checked={extractOnComplete}
    onCheckedChange={(checked) => setExtractOnComplete(checked === true)}
  />
  <label htmlFor="extract-insights" className="text-sm">
    면접 종료 후 인사이트 자동 추출
  </label>
</div>
```

기존 종료 핸들러 수정 — 종료 성공 후 `extractOnComplete`가 true이면 추출 API 호출:

```typescript
// 기존 handleComplete 함수 끝에 추가
if (extractOnComplete) {
  try {
    const extractRes = await fetch("/api/insights/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    })
    const extractData = await extractRes.json()
    if (extractRes.ok) {
      toast.success(`${extractData.insights.length}개의 인사이트가 추출되었습니다.`)
    }
  } catch {
    // 추출 실패는 비차단 — 토스트만
    toast.error("인사이트 추출에 실패했습니다.")
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/interviews/interview-chat.tsx
git commit -m "feat(insights): add extract button and auto-extract checkbox to interview chat"
```

---

## Task 8: 인사이트 카드 컴포넌트

**Files:**
- Create: `components/insights/insight-card.tsx`
- Reference: `components/interviews/interview-card.tsx` (카드 패턴, 삭제 버튼)

- [ ] **Step 1: Write implementation**

```typescript
// components/insights/insight-card.tsx
"use client"

import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

const CATEGORY_CONFIG = {
  strength: { label: "강점", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  experience: { label: "경험", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  motivation: { label: "동기", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  skill: { label: "기술", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  other: { label: "기타", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
} as const

export interface InsightCardData {
  id: string
  category: string
  title: string
  content: string
  createdAt: string
  conversation: {
    id: string
    type: string
    coverLetterId: string | null
    interviewSessionId: string | null
  } | null
}

interface InsightCardProps {
  insight: InsightCardData
  onEdit: (insight: InsightCardData) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function getSourceLink(conversation: InsightCardData["conversation"]) {
  if (!conversation) return null
  if (conversation.type === "COVER_LETTER" && conversation.coverLetterId) {
    return { href: `/cover-letters/${conversation.coverLetterId}`, label: "자기소개서" }
  }
  if (conversation.type === "INTERVIEW" && conversation.interviewSessionId) {
    return { href: `/interviews/${conversation.interviewSessionId}`, label: "면접" }
  }
  return null
}

export function InsightCard({ insight, onEdit, onDelete, isDeleting }: InsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.other
  const source = getSourceLink(insight.conversation)

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
            {source && (
              <Link
                href={source.href}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                {source.label}에서 추출
              </Link>
            )}
          </div>
        </div>
        <h3 className="text-sm font-semibold leading-tight">{insight.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {insight.content}
        </p>
      </CardContent>
      <div
        className="absolute right-2 top-2 flex gap-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="인사이트 수정"
          onClick={() => onEdit(insight)}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="인사이트 삭제"
              disabled={isDeleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>인사이트 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 인사이트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(insight.id)}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/insights/insight-card.tsx
git commit -m "feat(insights): add insight card component with category badges"
```

---

## Task 9: 인사이트 편집 다이얼로그

**Files:**
- Create: `components/insights/insight-edit-dialog.tsx`

- [ ] **Step 1: Write implementation**

```typescript
// components/insights/insight-edit-dialog.tsx
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { InsightCardData } from "./insight-card"

const CATEGORY_OPTIONS = [
  { value: "strength", label: "강점" },
  { value: "experience", label: "경험" },
  { value: "motivation", label: "동기" },
  { value: "skill", label: "기술" },
  { value: "other", label: "기타" },
] as const

interface InsightEditDialogProps {
  insight: InsightCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InsightEditDialog({
  insight,
  open,
  onOpenChange,
  onSuccess,
}: InsightEditDialogProps) {
  const [title, setTitle] = useState(insight?.title ?? "")
  const [content, setContent] = useState(insight?.content ?? "")
  const [category, setCategory] = useState(insight?.category ?? "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (insight) {
      setTitle(insight.title)
      setContent(insight.content)
      setCategory(insight.category)
    }
  }, [insight])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!insight) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.")
      }
      toast.success("인사이트가 수정되었습니다.")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "수정에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>인사이트 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insight-category">카테고리</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="insight-category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insight-title">제목</Label>
            <Input
              id="insight-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insight-content">내용</Label>
            <Textarea
              id="insight-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/insights/insight-edit-dialog.tsx
git commit -m "feat(insights): add insight edit dialog component"
```

---

## Task 10: 인사이트 목록 컴포넌트

**Files:**
- Create: `components/insights/insight-list.tsx`
- Reference: `components/interviews/interview-list.tsx` (낙관적 삭제 패턴)

- [ ] **Step 1: Write implementation**

```typescript
// components/insights/insight-list.tsx
"use client"

import { useCallback, useOptimistic, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Clock } from "lucide-react"

import { InsightCard, type InsightCardData } from "./insight-card"
import { InsightEditDialog } from "./insight-edit-dialog"

const CATEGORY_TABS = [
  { value: "all", label: "전체" },
  { value: "strength", label: "강점" },
  { value: "experience", label: "경험" },
  { value: "motivation", label: "동기" },
  { value: "skill", label: "기술" },
  { value: "other", label: "기타" },
] as const

interface CategoryCount {
  category: string
  _count: { _all: number }
}

interface InsightListProps {
  insights: InsightCardData[]
  categoryCounts: CategoryCount[]
  currentCategory: string
  currentSort: string
}

export function InsightList({
  insights,
  categoryCounts,
  currentCategory,
  currentSort,
}: InsightListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingInsight, setEditingInsight] = useState<InsightCardData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [optimisticList, removeOptimistic] = useOptimistic(
    insights,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  )

  const totalCount = categoryCounts.reduce((sum, c) => sum + c._count._all, 0)

  const getCount = (category: string) => {
    if (category === "all") return totalCount
    return categoryCounts.find((c) => c.category === category)?._count._all ?? 0
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("category")
    } else {
      params.set("category", value)
    }
    router.push(`/insights?${params.toString()}`)
  }

  const handleSortToggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    const newSort = currentSort === "category" ? "time" : "category"
    params.set("sort", newSort)
    router.push(`/insights?${params.toString()}`)
  }

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))
      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/insights/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "삭제에 실패했습니다.")
        }
        toast.success("인사이트가 삭제되었습니다.")
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

  const handleEdit = (insight: InsightCardData) => {
    setEditingInsight(insight)
    setEditDialogOpen(true)
  }

  const groupedInsights = currentSort === "category"
    ? CATEGORY_TABS
        .filter((tab) => tab.value !== "all")
        .map((tab) => ({
          category: tab.value,
          label: tab.label,
          items: optimisticList.filter((i) => i.category === tab.value),
        }))
        .filter((group) => group.items.length > 0)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={currentCategory} onValueChange={handleCategoryChange}>
          <TabsList>
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="text-muted-foreground ml-1 text-xs">
                  {getCount(tab.value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={handleSortToggle}>
          {currentSort === "category" ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              시간순
            </>
          ) : (
            <>
              <LayoutGrid className="mr-2 h-4 w-4" />
              카테고리별
            </>
          )}
        </Button>
      </div>

      {optimisticList.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          아직 추출된 인사이트가 없습니다. 자기소개서나 면접 대화에서 추출해보세요.
        </p>
      ) : groupedInsights ? (
        <div className="space-y-6">
          {groupedInsights.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-semibold">{group.label}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isDeleting={deletingIds.has(insight.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {optimisticList.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(insight.id)}
            />
          ))}
        </div>
      )}

      <InsightEditDialog
        key={editingInsight?.id}
        insight={editingInsight}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/insights/insight-list.tsx
git commit -m "feat(insights): add insight list with category tabs, sort toggle, and optimistic delete"
```

---

## Task 11: 인사이트 대시보드 페이지

**Files:**
- Create: `app/(dashboard)/insights/page.tsx`
- Reference: `app/(dashboard)/interviews/page.tsx` (Server Component 패턴)

- [ ] **Step 1: Write implementation**

```typescript
// app/(dashboard)/insights/page.tsx
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Lightbulb } from "lucide-react"

import { getAuthUser } from "@/lib/supabase/server"
import { listInsights, countByCategory } from "@/lib/insights/service"
import { InsightList } from "@/components/insights/insight-list"

interface PageProps {
  searchParams: Promise<{ category?: string; sort?: string }>
}

async function InsightListSection({
  userId,
  category,
  sort,
}: {
  userId: string
  category?: string
  sort: string
}) {
  const [insights, categoryCounts] = await Promise.all([
    listInsights(userId, category),
    countByCategory(userId),
  ])

  const serialized = insights.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }))

  return (
    <InsightList
      insights={serialized}
      categoryCounts={categoryCounts}
      currentCategory={category ?? "all"}
      currentSort={sort}
    />
  )
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { category, sort = "time" } = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6" />
        <h1 className="text-2xl font-bold">인사이트</h1>
      </div>

      <Suspense
        fallback={
          <p className="text-muted-foreground py-12 text-center">
            불러오는 중...
          </p>
        }
      >
        <InsightListSection
          userId={user.id}
          category={category}
          sort={sort}
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/insights/page.tsx"
git commit -m "feat(insights): add insights dashboard page with server-side data fetching"
```

---

## Task 12: spec-deviations 업데이트 + 최종 검증

**Files:**
- Modify: `docs/references/spec-deviations.md`

- [ ] **Step 1: Add Phase 5 deviations**

`spec-deviations.md`에 Phase 5 항목 추가:

```markdown
## Phase 5: 인사이트 추출

### `app/api/insights/route.ts` 생략

- **스펙**: `app/api/insights/route.ts` 신규 생성 (목록 조회 API)
- **실제**: API route 미생성, Server Component에서 `listInsights()` 직접 호출
- **이유**: 기존 코드베이스 패턴 (interviews, cover-letters 목록 모두 SC 직접 호출)

### `insight-edit-dialog.tsx` 신규 추가

- **스펙**: `insight-card.tsx`에서 "인라인 편집 또는 다이얼로그"
- **실제**: 별도 `insight-edit-dialog.tsx` 컴포넌트로 분리
- **이유**: 다이얼로그 방식 선택 + 컴포넌트 관심사 분리
```

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add docs/references/spec-deviations.md
git commit -m "docs: add phase-5 spec deviations"
```
