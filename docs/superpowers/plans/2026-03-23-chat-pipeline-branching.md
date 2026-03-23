# 채팅 파이프라인 프로바이더별 분기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로바이더별로 최적의 채팅 파이프라인을 분기한다 — OpenAI는 멀티스텝 tool loop, Anthropic/Google은 1단계 분류 + 서버 실행.

**Architecture:** 기존 API route의 `streamText` 호출을 `lib/ai/pipeline/` 모듈로 추출하고, provider에 따라 multi-step 또는 classification 파이프라인을 선택한다. 분류 경로 실패 시 멀티스텝으로 폴백한다.

**Tech Stack:** AI SDK v6 (`generateText`, `Output.object`, `streamText`, `stepCountIs`), Zod, Prisma

**Spec:** `docs/superpowers/specs/2026-03-23-chat-pipeline-branching-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `lib/ai/pipeline/types.ts` | 파이프라인 공통 타입 정의 |
| `lib/ai/pipeline/schema.ts` | 분류 스키마 (커버레터용, 면접용) |
| `lib/ai/pipeline/classify.ts` | 1단계 분류 함수 |
| `lib/ai/pipeline/compress.ts` | 대화 압축 함수 |
| `lib/ai/pipeline/multi-step.ts` | 멀티스텝 파이프라인 (기존 로직 추출) |
| `lib/ai/pipeline/classification.ts` | 분류 파이프라인 (1단계→서버→2단계) |
| `lib/ai/pipeline/index.ts` | 프로바이더 분기 + export barrel |
| `app/api/chat/cover-letter/route.ts` | 파이프라인 모듈 사용으로 변경 |
| `app/api/chat/interview/route.ts` | 동일 |
| `tests/lib/ai/pipeline/schema.test.ts` | 스키마 테스트 |
| `tests/lib/ai/pipeline/classify.test.ts` | 분류 함수 테스트 |
| `tests/lib/ai/pipeline/compress.test.ts` | 압축 함수 테스트 |
| `tests/lib/ai/pipeline/multi-step.test.ts` | 멀티스텝 파이프라인 테스트 |
| `tests/lib/ai/pipeline/classification.test.ts` | 분류 파이프라인 테스트 |
| `tests/lib/ai/pipeline/index.test.ts` | 프로바이더 분기 테스트 |

---

### Task 1: 파이프라인 공통 타입 정의

**Files:**
- Create: `lib/ai/pipeline/types.ts`

- [ ] **Step 1: 타입 파일 작성**

```typescript
// lib/ai/pipeline/types.ts
import type { LanguageModel, StreamTextResult } from "ai"

export interface PipelineParams {
  model: LanguageModel
  provider: string
  system: string
  modelMessages: Awaited<ReturnType<typeof import("ai").convertToModelMessages>>
  userId: string
  conversationId: string
  // 멀티스텝 전용
  tools?: Record<string, unknown>
  documentCount?: number
  careerNoteCount?: number
  // 분류 전용
  context?: string
  selectedDocumentIds?: string[]
  includeCareerNotes?: boolean
}

export interface PipelineResult {
  stream: StreamTextResult<Record<string, unknown>>
  /** 분류/압축 단계의 토큰 사용량 (분류 경로만) */
  preStageUsage?: { inputTokens: number; outputTokens: number }[]
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/ai/pipeline/types.ts
git commit -m "feat(pipeline): add pipeline common types"
```

---

### Task 2: 분류 스키마 정의

**Files:**
- Create: `lib/ai/pipeline/schema.ts`
- Create: `tests/lib/ai/pipeline/schema.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/schema.test.ts
import { describe, it, expect } from "vitest"
import {
  coverLetterClassificationSchema,
  interviewClassificationSchema,
} from "@/lib/ai/pipeline/schema"

describe("coverLetterClassificationSchema", () => {
  it("유효한 입력을 파싱한다", () => {
    const input = {
      documentsToRead: ["doc-1", "doc-2"],
      compareCareerNotes: true,
      needsCompression: false,
    }
    const result = coverLetterClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(input)
  })

  it("documentsToRead가 빈 배열이어도 유효하다", () => {
    const input = {
      documentsToRead: [],
      compareCareerNotes: false,
      needsCompression: false,
    }
    expect(coverLetterClassificationSchema.safeParse(input).success).toBe(true)
  })

  it("compareCareerNotes 필드가 없으면 실패한다", () => {
    const input = { documentsToRead: [], needsCompression: false }
    expect(coverLetterClassificationSchema.safeParse(input).success).toBe(false)
  })
})

describe("interviewClassificationSchema", () => {
  it("compareCareerNotes 없이 유효하다", () => {
    const input = {
      documentsToRead: ["doc-1"],
      needsCompression: true,
    }
    const result = interviewClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(input)
  })

  it("compareCareerNotes가 있으면 무시한다 (strip)", () => {
    const input = {
      documentsToRead: [],
      compareCareerNotes: true,
      needsCompression: false,
    }
    const result = interviewClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty("compareCareerNotes")
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/schema.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 스키마 구현**

```typescript
// lib/ai/pipeline/schema.ts
import { z } from "zod"

export const coverLetterClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  compareCareerNotes: z.boolean()
    .describe("커리어노트 상세 비교가 필요하면 true"),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})

export const interviewClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})

export type CoverLetterClassification = z.infer<typeof coverLetterClassificationSchema>
export type InterviewClassification = z.infer<typeof interviewClassificationSchema>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/schema.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/schema.ts tests/lib/ai/pipeline/schema.test.ts
git commit -m "feat(pipeline): add classification schemas for cover-letter and interview"
```

---

### Task 3: 분류 함수 구현

**Files:**
- Create: `lib/ai/pipeline/classify.ts`
- Create: `tests/lib/ai/pipeline/classify.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/classify.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((opts: unknown) => opts) },
}))

import { generateText } from "ai"
import { classify } from "@/lib/ai/pipeline/classify"
import { coverLetterClassificationSchema } from "@/lib/ai/pipeline/schema"

const mockGenerateText = vi.mocked(generateText)

describe("classify", () => {
  it("Output.object + generateText를 호출하고 결과를 반환한다", async () => {
    const mockOutput = {
      documentsToRead: ["doc-1"],
      compareCareerNotes: true,
      needsCompression: false,
    }
    mockGenerateText.mockResolvedValue({
      output: mockOutput,
      usage: { inputTokens: 100, outputTokens: 20 },
    } as never)

    const result = await classify({
      model: {} as never,
      schema: coverLetterClassificationSchema,
      context: "[문서: 이력서]\n요약 내용",
      messages: [{ role: "user", content: "자소서 써줘" }],
    })

    expect(result.classification).toEqual(mockOutput)
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 })
    expect(mockGenerateText).toHaveBeenCalledOnce()
  })

  it("output이 null이면 에러를 던진다", async () => {
    mockGenerateText.mockResolvedValue({
      output: null,
      usage: { inputTokens: 50, outputTokens: 0 },
    } as never)

    await expect(
      classify({
        model: {} as never,
        schema: coverLetterClassificationSchema,
        context: "",
        messages: [],
      })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/classify.test.ts`
Expected: FAIL

- [ ] **Step 3: 분류 함수 구현**

```typescript
// lib/ai/pipeline/classify.ts
import { generateText, Output, type LanguageModel } from "ai"
import type { z } from "zod"

interface ClassifyParams<T extends z.ZodType> {
  model: LanguageModel
  schema: T
  context: string
  messages: { role: string; content: string }[]
}

interface ClassifyResult<T> {
  classification: T
  usage: { inputTokens: number; outputTokens: number }
}

export async function classify<T extends z.ZodType>(
  params: ClassifyParams<T>,
): Promise<ClassifyResult<z.infer<T>>> {
  const prompt = `사용자 메시지와 참고자료 요약을 보고 판단하세요.

[참고자료 요약]
${params.context}

[현재 대화]
${params.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`

  const result = await generateText({
    model: params.model,
    output: Output.object({ schema: params.schema }),
    prompt,
  })

  if (!result.output) {
    throw new Error("분류 결과가 비어있습니다.")
  }

  return {
    classification: result.output,
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/classify.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/classify.ts tests/lib/ai/pipeline/classify.test.ts
git commit -m "feat(pipeline): add classification function with generateText + Output.object"
```

---

### Task 4: 대화 압축 함수 구현

**Files:**
- Create: `lib/ai/pipeline/compress.ts`
- Create: `tests/lib/ai/pipeline/compress.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/compress.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

import { generateText } from "ai"
import { compressMessages } from "@/lib/ai/pipeline/compress"

const mockGenerateText = vi.mocked(generateText)

describe("compressMessages", () => {
  it("4턴 이하이면 압축 없이 그대로 반환한다", async () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "안녕" }] },
      { role: "assistant" as const, content: [{ type: "text" as const, text: "네" }] },
    ]

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    expect(result.messages).toEqual(messages)
    expect(result.usage).toBeUndefined()
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it("4턴 초과 시 앞부분을 요약하고 최근 4턴을 유지한다", async () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: [{ type: "text" as const, text: `메시지 ${i}` }],
    }))

    mockGenerateText.mockResolvedValue({
      text: "이전 대화 요약입니다.",
      usage: { inputTokens: 200, outputTokens: 30 },
    } as never)

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    // 요약 system 메시지 + 최근 4턴 = 5개
    expect(result.messages).toHaveLength(5)
    expect(result.messages[0].role).toBe("user")
    // 요약 내용이 첫 메시지에 포함
    expect(result.usage).toBeDefined()
  })

  it("압축 실패 시 원본 메시지를 그대로 반환한다", async () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: [{ type: "text" as const, text: `메시지 ${i}` }],
    }))

    mockGenerateText.mockRejectedValue(new Error("API 에러"))

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    expect(result.messages).toEqual(messages)
    expect(result.usage).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/compress.test.ts`
Expected: FAIL

- [ ] **Step 3: 압축 함수 구현**

```typescript
// lib/ai/pipeline/compress.ts
import { generateText, type LanguageModel } from "ai"

const RECENT_TURNS = 4

interface CompressParams {
  model: LanguageModel
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
}

interface CompressResult {
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function compressMessages(params: CompressParams): Promise<CompressResult> {
  const { model, messages } = params

  if (messages.length <= RECENT_TURNS) {
    return { messages }
  }

  const oldMessages = messages.slice(0, -RECENT_TURNS)
  const recentMessages = messages.slice(-RECENT_TURNS)

  try {
    const oldText = oldMessages
      .map((m) => {
        const text = Array.isArray(m.content)
          ? m.content
              .filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }) => p.text)
              .join("")
          : String(m.content)
        return `${m.role}: ${text}`
      })
      .join("\n")

    const { text: summary, usage } = await generateText({
      model,
      system: "이전 대화 내용을 3~5문장으로 요약하세요. 핵심 요청, 결정사항, 맥락을 유지하세요.",
      prompt: oldText,
    })

    const summaryMessage = {
      role: "user" as const,
      content: [{ type: "text" as const, text: `[이전 대화 요약]\n${summary}` }],
    }

    return {
      messages: [summaryMessage, ...recentMessages],
      usage: usage
        ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }
        : undefined,
    }
  } catch (error) {
    console.error("[compressMessages] 압축 실패, 원본 사용:", error)
    return { messages }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/compress.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/compress.ts tests/lib/ai/pipeline/compress.test.ts
git commit -m "feat(pipeline): add message compression with graceful fallback"
```

---

### Task 5: 멀티스텝 파이프라인 추출

**Files:**
- Create: `lib/ai/pipeline/multi-step.ts`
- Create: `tests/lib/ai/pipeline/multi-step.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/multi-step.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  streamText: vi.fn(),
  stepCountIs: vi.fn().mockReturnValue("stop-condition"),
}))

import { streamText } from "ai"
import { handleMultiStep } from "@/lib/ai/pipeline/multi-step"

const mockStreamText = vi.mocked(streamText)

describe("handleMultiStep", () => {
  it("streamText를 tools + stopWhen과 함께 호출한다", () => {
    const mockResult = { toUIMessageStreamResponse: vi.fn() }
    mockStreamText.mockReturnValue(mockResult as never)

    const tools = { readDocument: {} }
    const result = handleMultiStep({
      model: {} as never,
      system: "시스템 프롬프트",
      modelMessages: [] as never,
      tools: tools as never,
      documentCount: 3,
      careerNoteCount: 2,
      onFinish: vi.fn(),
    })

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "시스템 프롬프트",
        tools,
      })
    )
    expect(result).toBe(mockResult)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/multi-step.test.ts`
Expected: FAIL

- [ ] **Step 3: 멀티스텝 파이프라인 구현**

```typescript
// lib/ai/pipeline/multi-step.ts
import { streamText, type LanguageModel } from "ai"
import { calculateMaxSteps } from "@/lib/ai/tools"

interface MultiStepParams {
  model: LanguageModel
  system: string
  modelMessages: Parameters<typeof streamText>[0]["messages"]
  tools: Parameters<typeof streamText>[0]["tools"]
  documentCount: number
  careerNoteCount: number
  onFinish: Parameters<typeof streamText>[0]["onFinish"]
}

export function handleMultiStep(params: MultiStepParams) {
  return streamText({
    model: params.model,
    system: params.system,
    messages: params.modelMessages,
    tools: params.tools,
    stopWhen: calculateMaxSteps(params.documentCount, params.careerNoteCount),
    onFinish: params.onFinish,
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/multi-step.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/multi-step.ts tests/lib/ai/pipeline/multi-step.test.ts
git commit -m "feat(pipeline): extract multi-step pipeline from route handlers"
```

---

### Task 6: 분류 파이프라인 구현

**Files:**
- Create: `lib/ai/pipeline/classification.ts`
- Create: `tests/lib/ai/pipeline/classification.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/classification.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  Output: { object: vi.fn((opts: unknown) => opts) },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findMany: vi.fn() },
    careerNote: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/ai/pipeline/classify", () => ({
  classify: vi.fn(),
}))

vi.mock("@/lib/ai/pipeline/compress", () => ({
  compressMessages: vi.fn(),
}))

import { streamText } from "ai"
import { prisma } from "@/lib/prisma"
import { classify } from "@/lib/ai/pipeline/classify"
import { compressMessages } from "@/lib/ai/pipeline/compress"
import { handleClassification } from "@/lib/ai/pipeline/classification"

const mockClassify = vi.mocked(classify)
const mockCompress = vi.mocked(compressMessages)
const mockStreamText = vi.mocked(streamText)

describe("handleClassification", () => {
  it("분류 결과에 따라 문서를 조회하고 streamText를 tools 없이 호출한다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: ["doc-1"],
        compareCareerNotes: false,
        needsCompression: false,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    mockCompress.mockResolvedValue({ messages: [] as never })
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: "내용" },
    ] as never)
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "시스템 프롬프트",
      modelMessages: [] as never,
      userId: "user-1",
      context: "요약",
      selectedDocumentIds: ["doc-1", "doc-2"],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    // streamText에 tools가 없어야 한다
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.not.objectContaining({ tools: expect.anything() })
    )
  })

  it("needsCompression이 true이면 compressMessages를 호출한다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: [],
        compareCareerNotes: false,
        needsCompression: true,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    mockCompress.mockResolvedValue({
      messages: [{ role: "user", content: "요약" }] as never,
      usage: { inputTokens: 50, outputTokens: 10 },
    })
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "프롬프트",
      modelMessages: [{ role: "user", content: "긴 대화" }] as never,
      userId: "user-1",
      context: "",
      selectedDocumentIds: [],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    expect(mockCompress).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/classification.test.ts`
Expected: FAIL

- [ ] **Step 3: 분류 파이프라인 구현**

```typescript
// lib/ai/pipeline/classification.ts
import { streamText, type LanguageModel } from "ai"
import type { z } from "zod"
import { prisma } from "@/lib/prisma"
import { classify } from "./classify"
import { compressMessages } from "./compress"

interface ClassificationPipelineParams {
  model: LanguageModel
  system: string
  modelMessages: Parameters<typeof streamText>[0]["messages"]
  userId: string
  context: string
  selectedDocumentIds: string[]
  includeCareerNotes: boolean
  schema: z.ZodType
  onFinish: Parameters<typeof streamText>[0]["onFinish"]
}

export interface ClassificationPreStageUsage {
  inputTokens: number
  outputTokens: number
}

export async function handleClassification(params: ClassificationPipelineParams) {
  const preStageUsages: ClassificationPreStageUsage[] = []

  // 1단계: 분류
  const { classification, usage: classifyUsage } = await classify({
    model: params.model,
    schema: params.schema,
    context: params.context,
    messages: extractTextFromMessages(params.modelMessages),
  })
  preStageUsages.push(classifyUsage)

  // 서버 실행: 분류 결과에 따라 병렬 데이터 수집
  const docsToRead = classification.documentsToRead ?? []
  const compareNotes = "compareCareerNotes" in classification
    ? classification.compareCareerNotes
    : false
  const needsCompress = classification.needsCompression ?? false

  const [documents, careerNotes] = await Promise.all([
    docsToRead.length > 0
      ? prisma.document.findMany({
          where: {
            id: { in: docsToRead },
            userId: params.userId,
          },
          select: { id: true, title: true, extractedText: true },
        })
      : [],
    compareNotes
      ? prisma.careerNote.findMany({
          where: { userId: params.userId, status: "CONFIRMED" },
          select: { id: true, title: true, content: true, metadata: true },
        })
      : [],
  ])

  // 대화 압축
  let finalMessages = params.modelMessages
  if (needsCompress) {
    const compressed = await compressMessages({
      model: params.model,
      messages: params.modelMessages as { role: "user" | "assistant"; content: unknown }[],
    })
    finalMessages = compressed.messages as typeof params.modelMessages
    if (compressed.usage) {
      preStageUsages.push(compressed.usage)
    }
  }

  // 시스템 프롬프트 확장: 문서/노트 전문 주입
  const docsContext = documents.length > 0
    ? documents.map((d) => `[${d.title}]\n${d.extractedText ?? ""}`).join("\n\n---\n\n")
    : ""
  const notesContext = careerNotes.length > 0
    ? careerNotes.map((n) => `[${n.title}]\n${n.content}`).join("\n\n---\n\n")
    : ""

  let extendedSystem = params.system
  if (docsContext) {
    extendedSystem += `\n\n[참고자료 — 문서 전문]\n${docsContext}`
  }
  if (notesContext) {
    extendedSystem += `\n\n[참고자료 — 커리어노트 전문]\n${notesContext}`
  }

  // 2단계: 응답 생성 (tools 없음)
  const result = streamText({
    model: params.model,
    system: extendedSystem,
    messages: finalMessages,
    onFinish: params.onFinish,
  })

  return { result, preStageUsages }
}

function extractTextFromMessages(messages: unknown): { role: string; content: string }[] {
  if (!Array.isArray(messages)) return []
  return messages.map((m) => ({
    role: String(m.role ?? "user"),
    content: Array.isArray(m.content)
      ? m.content
          .filter((p: { type: string }) => p.type === "text")
          .map((p: { text: string }) => p.text)
          .join("")
      : String(m.content ?? ""),
  }))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/classification.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/classification.ts tests/lib/ai/pipeline/classification.test.ts
git commit -m "feat(pipeline): add classification pipeline with doc fetch and compression"
```

---

### Task 7: 프로바이더 분기 + export barrel

**Files:**
- Create: `lib/ai/pipeline/index.ts`
- Create: `tests/lib/ai/pipeline/index.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/lib/ai/pipeline/index.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/ai/pipeline/multi-step", () => ({
  handleMultiStep: vi.fn().mockReturnValue("multi-step-result"),
}))

vi.mock("@/lib/ai/pipeline/classification", () => ({
  handleClassification: vi.fn().mockResolvedValue({
    result: "classification-result",
    preStageUsages: [],
  }),
}))

import { handleMultiStep } from "@/lib/ai/pipeline/multi-step"
import { handleClassification } from "@/lib/ai/pipeline/classification"
import { selectPipeline } from "@/lib/ai/pipeline"

describe("selectPipeline", () => {
  it("openai이면 multi-step을 반환한다", () => {
    const result = selectPipeline("openai")
    expect(result).toBe("multi-step")
  })

  it("anthropic이면 classification을 반환한다", () => {
    const result = selectPipeline("anthropic")
    expect(result).toBe("classification")
  })

  it("google이면 classification을 반환한다", () => {
    const result = selectPipeline("google")
    expect(result).toBe("classification")
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/index.test.ts`
Expected: FAIL

- [ ] **Step 3: 분기 로직 구현**

```typescript
// lib/ai/pipeline/index.ts
export { handleMultiStep } from "./multi-step"
export { handleClassification } from "./classification"
export type { ClassificationPreStageUsage } from "./classification"
export {
  coverLetterClassificationSchema,
  interviewClassificationSchema,
} from "./schema"

export function selectPipeline(provider: string): "multi-step" | "classification" {
  if (provider === "openai") {
    return "multi-step"
  }
  return "classification"
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/index.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/ai/pipeline/index.ts tests/lib/ai/pipeline/index.test.ts
git commit -m "feat(pipeline): add provider-based pipeline selection"
```

---

### Task 8: 커버레터 API route 통합

**Files:**
- Modify: `app/api/chat/cover-letter/route.ts`
- Modify: `tests/app/api/chat/cover-letter/route.test.ts`

- [ ] **Step 1: route.ts 수정**

`app/api/chat/cover-letter/route.ts`를 수정한다. 기존 `streamText` 직접 호출을 파이프라인 모듈로 교체.

주요 변경:
1. `maxDuration`을 `120`으로 변경
2. import에 파이프라인 모듈 추가
3. `provider` 값에 따라 `handleMultiStep` 또는 `handleClassification` 호출
4. 분류 경로 실패 시 멀티스텝으로 폴백
5. 분류 경로의 pre-stage 토큰 사용량 별도 기록

핵심 변경 코드 (기존 `streamText` 호출 부분 교체):

```typescript
import {
  selectPipeline,
  handleMultiStep,
  handleClassification,
  coverLetterClassificationSchema,
} from "@/lib/ai/pipeline"

// ... 기존 인증/검증/컨텍스트 로드 로직 유지 ...

const pipeline = selectPipeline(aiProvider)

if (pipeline === "multi-step") {
  const result = handleMultiStep({
    model,
    system,
    modelMessages,
    tools: {
      readDocument: createReadDocumentTool(user.id, selectedDocumentIds ?? []),
      readCareerNote: createReadCareerNoteTool(user.id),
      saveCareerNote: createSaveCareerNoteTool(user.id, conversationId),
    },
    documentCount: selectedDocumentIds?.length ?? 0,
    careerNoteCount,
    onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "COVER_LETTER" }),
  })
  return result.toUIMessageStreamResponse()
} else {
  try {
    const { result, preStageUsages } = await handleClassification({
      model,
      system,
      modelMessages,
      userId: user.id,
      context,
      selectedDocumentIds: selectedDocumentIds ?? [],
      includeCareerNotes: true,
      schema: coverLetterClassificationSchema,
      onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "COVER_LETTER" }),
    })
    // pre-stage 토큰 기록
    for (const usage of preStageUsages) {
      recordUsage({
        userId: user.id, provider: aiProvider, model: modelId,
        feature: "COVER_LETTER",
        promptTokens: usage.inputTokens, completionTokens: usage.outputTokens,
        totalTokens: usage.inputTokens + usage.outputTokens,
        isServerKey, metadata: { conversationId },
      }).catch((e) => console.error("pre-stage 토큰 기록 실패:", e))
    }
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[classification fallback]", error)
    // 폴백: 멀티스텝
    const result = handleMultiStep({
      model, system, modelMessages,
      tools: {
        readDocument: createReadDocumentTool(user.id, selectedDocumentIds ?? []),
        readCareerNote: createReadCareerNoteTool(user.id),
        saveCareerNote: createSaveCareerNoteTool(user.id, conversationId),
      },
      documentCount: selectedDocumentIds?.length ?? 0,
      careerNoteCount,
      onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "COVER_LETTER" }),
    })
    return result.toUIMessageStreamResponse()
  }
}
```

- [ ] **Step 2: onFinish 헬퍼 추출**

기존 `onFinish` 콜백을 `buildOnFinish` 헬퍼로 추출하여 두 경로에서 재사용. 같은 파일 내 private 함수로.

```typescript
interface BuildOnFinishParams {
  conversationId: string
  lastMessage: { role: string; parts?: { type: string; text: string }[]; content?: string }
  lastMessageContent: string
  userId: string
  aiProvider: string
  modelId: string
  isServerKey: boolean
  feature: "COVER_LETTER" | "INTERVIEW"
}

function buildOnFinish(params: BuildOnFinishParams) {
  return async ({ text, usage, steps }: {
    text: string
    usage?: { inputTokens?: number; outputTokens?: number }
    steps: { toolCalls?: { toolName: string }[] }[]
  }) => {
    // 도구 호출 로깅 (멀티스텝 경로에서만 의미 있음, 분류 경로에서는 빈 배열)
    const toolCalls = steps.flatMap(s => s.toolCalls ?? [])
    if (toolCalls.length > 0) {
      console.log(`[${params.feature}] 도구 호출 ${toolCalls.length}건:`, toolCalls.map(tc => tc.toolName).join(", "))
    }

    // USER + ASSISTANT 메시지 트랜잭션 저장
    const ops = [
      ...(params.lastMessage.role === "user" && params.lastMessageContent
        ? [prisma.message.create({
            data: { conversationId: params.conversationId, role: MessageRole.USER, content: params.lastMessageContent },
          })]
        : []),
      ...(text
        ? [prisma.message.create({
            data: { conversationId: params.conversationId, role: MessageRole.ASSISTANT, content: text },
          })]
        : []),
    ]
    if (ops.length > 0) {
      await prisma.$transaction(ops)
    }

    // 토큰 사용량 기록 (2단계 응답 생성 분)
    if (usage) {
      await recordUsage({
        userId: params.userId,
        provider: params.aiProvider,
        model: params.modelId,
        feature: params.feature,
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
        totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        isServerKey: params.isServerKey,
        metadata: { conversationId: params.conversationId },
      }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
    }
  }
}
```

- [ ] **Step 3: 기존 테스트 실행하여 깨지는 부분 확인**

Run: `npx vitest run tests/app/api/chat/cover-letter/route.test.ts`
Expected: 일부 실패 가능 (import 변경 등)

- [ ] **Step 4: 테스트 수정 — 파이프라인 모듈 mock 추가**

기존 `vi.mock("ai", ...)` 외에 파이프라인 모듈 mock 추가.

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npx vitest run tests/app/api/chat/cover-letter/route.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add app/api/chat/cover-letter/route.ts tests/app/api/chat/cover-letter/route.test.ts
git commit -m "feat(chat): integrate provider-based pipeline branching in cover-letter route"
```

---

### Task 9: 면접 API route 통합

**Files:**
- Modify: `app/api/chat/interview/route.ts`
- Modify: `tests/app/api/chat/interview/route.test.ts`

- [ ] **Step 1: route.ts 수정**

커버레터와 동일한 분기 패턴. 차이점:
- `interviewClassificationSchema` 사용 (`compareCareerNotes` 필드 없음)
- tools에 `readDocument`만 포함
- `includeCareerNotes: false`
- `careerNoteCount: 0`
- `selectedDocumentIds`는 요청 body가 아닌 `allowedDocIds`(DB에서 조회)를 사용

핵심 변경 코드:

```typescript
import {
  selectPipeline,
  handleMultiStep,
  handleClassification,
  interviewClassificationSchema,
} from "@/lib/ai/pipeline"

// ... 기존 인증/검증/allowedDocIds 조회 로직 유지 ...
// maxDuration = 120으로 변경

const pipeline = selectPipeline(aiProvider)

if (pipeline === "multi-step") {
  const result = handleMultiStep({
    model,
    system,
    modelMessages,
    tools: {
      readDocument: createReadDocumentTool(user.id, allowedDocIds),
    },
    documentCount: allowedDocIds.length,
    careerNoteCount: 0,
    onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "INTERVIEW" }),
  })
  return result.toUIMessageStreamResponse()
} else {
  try {
    const { result, preStageUsages } = await handleClassification({
      model,
      system,
      modelMessages,
      userId: user.id,
      context,
      selectedDocumentIds: allowedDocIds,  // ← interview는 DB에서 조회한 allowedDocIds 사용
      includeCareerNotes: false,
      schema: interviewClassificationSchema,
      onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "INTERVIEW" }),
    })
    for (const usage of preStageUsages) {
      recordUsage({
        userId: user.id, provider: aiProvider, model: modelId,
        feature: "INTERVIEW",
        promptTokens: usage.inputTokens, completionTokens: usage.outputTokens,
        totalTokens: usage.inputTokens + usage.outputTokens,
        isServerKey, metadata: { conversationId },
      }).catch((e) => console.error("pre-stage 토큰 기록 실패:", e))
    }
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[classification fallback]", error)
    const result = handleMultiStep({
      model, system, modelMessages,
      tools: { readDocument: createReadDocumentTool(user.id, allowedDocIds) },
      documentCount: allowedDocIds.length, careerNoteCount: 0,
      onFinish: buildOnFinish({ conversationId, lastMessage, lastMessageContent, userId: user.id, aiProvider, modelId, isServerKey, feature: "INTERVIEW" }),
    })
    return result.toUIMessageStreamResponse()
  }
}
```

- [ ] **Step 2: 기존 테스트 실행**

Run: `npx vitest run tests/app/api/chat/interview/route.test.ts`

- [ ] **Step 3: 테스트 수정**

파이프라인 모듈 mock 추가.

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npx vitest run tests/app/api/chat/interview/route.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add app/api/chat/interview/route.ts tests/app/api/chat/interview/route.test.ts
git commit -m "feat(chat): integrate provider-based pipeline branching in interview route"
```

---

### Task 10: 전체 테스트 + 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

- [ ] **Step 2: TypeScript 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `npx next lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 검증 (선택)**

로컬 서버에서 커버레터/면접 채팅 테스트:
- OpenAI 모델 설정 → 도구 호출 확인 (멀티스텝)
- Anthropic/Google 모델 설정 → 도구 호출 없음 확인 (분류방식)

- [ ] **Step 5: 커밋 (변경 있을 경우만)**

```bash
git commit -m "fix: resolve integration issues from pipeline branching"
```
