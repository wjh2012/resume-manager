# 채팅 파이프라인 단순화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classification + Tool-calling 이중 파이프라인을 단일 streamText 파이프라인으로 통합

**Architecture:** 문서는 전문 로드 (LLM 선택 제거), 대화 압축은 토큰 임계값 기반, provider 분기 제거. LLM은 응답 생성만 담당.

**Tech Stack:** Next.js App Router, Vercel AI SDK (`ai`), Prisma, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-pipeline-simplification-design.md`

---

## 파일 구조 변경

### 신규 생성
| 파일 | 역할 |
|---|---|
| `lib/ai/tokens.ts` | `countTokens()`, `getModelContextWindow()` |

### 수정
| 파일 | 변경 |
|---|---|
| `types/ai.ts` | `PROVIDER_MODELS` 항목에 `contextWindow` 필드 추가 |
| `lib/ai/context.ts` | `buildContext()` → `buildFullContext()` (요약→전문, 반환값 단순화) |
| `lib/ai/pipeline/index.ts` | 전체 재작성 — `compressIfNeeded()` + `buildOnFinish` 재수출 |
| `lib/ai/prompts/cover-letter.ts` | 도구 안내 2줄 제거 |
| `lib/ai/prompts/interview.ts` | 도구 안내 1줄 제거 |
| `app/api/chat/cover-letter/route.ts` | 단일 파이프라인으로 단순화 |
| `app/api/chat/interview/route.ts` | 단일 파이프라인으로 단순화 |

### 삭제
| 파일 | 이유 |
|---|---|
| `lib/ai/pipeline/classify.ts` | classification 제거 |
| `lib/ai/pipeline/classification.ts` | classification 파이프라인 제거 |
| `lib/ai/pipeline/multi-step.ts` | tool-calling 파이프라인 제거 |
| `lib/ai/pipeline/schema.ts` | classification 스키마 제거 |
| `lib/ai/tools/index.ts` | 도구 내보내기 제거 |
| `lib/ai/tools/read-document.ts` | 도구 제거 |
| `lib/ai/tools/read-external-document.ts` | 도구 제거 |
| `lib/ai/tools/read-career-note.ts` | 도구 제거 |
| `lib/ai/tools/save-career-note.ts` | 도구 제거 |
| `tests/lib/ai/pipeline/classify.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/pipeline/classification.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/pipeline/multi-step.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/pipeline/schema.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/tools/read-document.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/tools/read-external-document.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/tools/read-career-note.test.ts` | 삭제된 파일의 테스트 |
| `tests/lib/ai/tools/save-career-note.test.ts` | 삭제된 파일의 테스트 |

---

## Task 1: `PROVIDER_MODELS`에 `contextWindow` 추가

**Files:**
- Modify: `types/ai.ts`
- Test: `tests/lib/ai/tokens.test.ts` (Task 2에서 함께 테스트)

- [ ] **Step 1: `types/ai.ts` 수정**

`PROVIDER_MODELS` 타입과 각 모델에 `contextWindow` 필드 추가:

```typescript
export const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string; contextWindow: number }[]> = {
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4", contextWindow: 1048576 },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano", contextWindow: 1048576 },
    { value: "gpt-4o", label: "GPT-4o", contextWindow: 128000 },
    { value: "gpt-4o-mini", label: "GPT-4o Mini", contextWindow: 128000 },
  ],
  anthropic: [
    { value: "claude-sonnet-4-6-20250627", label: "Claude Sonnet 4.6", contextWindow: 200000 },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", contextWindow: 200000 },
  ],
  google: [
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", contextWindow: 1048576 },
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro", contextWindow: 2097152 },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", contextWindow: 1048576 },
  ],
}
```

> Note: contextWindow 값은 각 모델 공식 문서 기준. 구현 시 최신 값 확인 필요.

- [ ] **Step 2: typecheck 확인**

Run: `npx tsc --noEmit`
Expected: PASS (contextWindow 추가는 하위 호환)

- [ ] **Step 3: Commit**

```
feat(ai): PROVIDER_MODELS에 contextWindow 필드 추가
```

---

## Task 2: 토큰 유틸리티 생성

**Files:**
- Create: `lib/ai/tokens.ts`
- Create: `tests/lib/ai/tokens.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// tests/lib/ai/tokens.test.ts
import { describe, it, expect } from "vitest"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"

describe("countTokens", () => {
  it("시스템 프롬프트와 메시지의 토큰 수를 근사 추정한다", () => {
    const system = "a".repeat(400) // 400 chars ≈ 100 tokens
    const messages = [{ content: "b".repeat(200) }] // 200 chars ≈ 50 tokens
    const result = countTokens(system, messages)
    expect(result).toBe(150)
  })

  it("배열 형태의 content를 처리한다", () => {
    const messages = [{ content: [{ type: "text", text: "a".repeat(100) }] }]
    const result = countTokens("", messages)
    expect(result).toBe(25)
  })

  it("빈 입력에 0을 반환한다", () => {
    expect(countTokens("", [])).toBe(0)
  })
})

describe("getModelContextWindow", () => {
  it("알려진 모델의 컨텍스트 윈도우를 반환한다", () => {
    const result = getModelContextWindow("openai", "gpt-4o")
    expect(result).toBe(128000)
  })

  it("알 수 없는 모델이면 에러를 던진다", () => {
    expect(() => getModelContextWindow("openai", "unknown-model")).toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/tokens.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

> Note: `countTokens(system, messages)` 시그니처에서 `system`은 `buildSystemPrompt({..., context})`의 결과물이므로 문서 컨텍스트가 이미 포함되어 있다. spec의 `countTokens(systemPrompt + documentContext + messages)`와 동일한 효과.

```typescript
// lib/ai/tokens.ts
import { PROVIDER_MODELS, type AIProvider } from "@/types/ai"

const CHARS_PER_TOKEN = 4

function contentLength(content: unknown): number {
  if (typeof content === "string") return content.length
  if (Array.isArray(content)) {
    return content.reduce((sum: number, part: unknown) => {
      if (typeof part === "object" && part !== null && "text" in part) {
        return sum + String((part as { text: string }).text).length
      }
      return sum
    }, 0)
  }
  return JSON.stringify(content).length
}

export function countTokens(
  system: string,
  messages: Array<{ content: unknown }>,
): number {
  const chars = system.length + messages.reduce((sum, m) => sum + contentLength(m.content), 0)
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

export function getModelContextWindow(provider: AIProvider, modelId: string): number {
  const models = PROVIDER_MODELS[provider]
  const found = models.find((m) => m.value === modelId)
  if (!found) {
    throw new Error(`Unknown model: ${provider}/${modelId}`)
  }
  return found.contextWindow
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(ai): 토큰 카운트 및 컨텍스트 윈도우 유틸리티 추가
```

---

## Task 3: `buildFullContext` 구현

**Files:**
- Modify: `lib/ai/context.ts`
- Modify: `tests/lib/ai/context.test.ts`

- [ ] **Step 1: 테스트 작성**

기존 `tests/lib/ai/context.test.ts`를 읽고, `buildFullContext` 테스트로 교체. 핵심 케이스:

```typescript
describe("buildFullContext", () => {
  it("문서의 전문(extractedText)을 포함한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: "전문 텍스트 내용" },
    ])
    const result = await buildFullContext("user-1", { selectedDocumentIds: ["doc-1"] })
    expect(result).toContain("전문 텍스트 내용")
    expect(result).not.toContain("요약")
  })

  it("extractedText가 없으면 '텍스트 없음' 표시", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: null },
    ])
    const result = await buildFullContext("user-1", { selectedDocumentIds: ["doc-1"] })
    expect(result).toContain("(텍스트 없음)")
  })

  it("외부 문서의 전문(content)을 포함한다", async () => {
    mockExtDocFindMany.mockResolvedValue([
      { id: "ext-1", title: "채용공고", category: "채용", content: "외부 문서 전문" },
    ])
    const result = await buildFullContext("user-1", { selectedExternalDocumentIds: ["ext-1"] })
    expect(result).toContain("외부 문서 전문")
  })

  it("커리어노트의 전문(content)을 포함한다", async () => {
    mockNoteFindMany.mockResolvedValue([
      { id: "note-1", title: "프로젝트A", content: "노트 전문", metadata: { project: "A" } },
    ])
    const result = await buildFullContext("user-1", { includeCareerNotes: true })
    expect(result).toContain("노트 전문")
  })

  it("string을 반환한다 (객체가 아님)", async () => {
    const result = await buildFullContext("user-1", {})
    expect(typeof result).toBe("string")
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/context.test.ts`
Expected: FAIL — `buildFullContext` 없음

- [ ] **Step 3: 구현**

`lib/ai/context.ts`에서 `buildContext`를 `buildFullContext`로 교체:

```typescript
import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

export async function buildFullContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  const parts: string[] = []

  if (opts.selectedDocumentIds && opts.selectedDocumentIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: opts.selectedDocumentIds }, userId },
      select: { id: true, title: true, extractedText: true },
    })
    for (const doc of docs) {
      parts.push(
        `[문서: ${doc.title} (ID: ${doc.id})]\n${doc.extractedText ?? "(텍스트 없음)"}`,
      )
    }
  }

  if (opts.selectedExternalDocumentIds && opts.selectedExternalDocumentIds.length > 0) {
    const extDocs = await prisma.externalDocument.findMany({
      where: { id: { in: opts.selectedExternalDocumentIds }, userId },
      select: { id: true, title: true, category: true, content: true },
    })
    for (const doc of extDocs) {
      const label = doc.category ? `${doc.category}: ${doc.title}` : doc.title
      parts.push(`[외부 문서: ${label} (ID: ${doc.id})]\n${doc.content}`)
    }
  }

  if (opts.includeCareerNotes) {
    const notes = await prisma.careerNote.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { id: true, title: true, content: true, metadata: true },
      orderBy: { updatedAt: "desc" },
    })
    for (const note of notes) {
      const meta = note.metadata
        ? `\n메타데이터: ${JSON.stringify(note.metadata)}`
        : ""
      parts.push(
        `[커리어노트: ${note.title} (ID: ${note.id})]\n${note.content}${meta}`,
      )
    }
  }

  return parts.join("\n\n---\n\n")
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/context.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(ai): buildFullContext — 문서 전문 로드로 전환
```

---

## Task 4: 시스템 프롬프트에서 도구 안내 제거

**Files:**
- Modify: `lib/ai/prompts/cover-letter.ts`
- Modify: `lib/ai/prompts/interview.ts`
- Modify: `tests/lib/ai/prompts/cover-letter.test.ts`
- Modify: `tests/lib/ai/prompts/interview.test.ts`

- [ ] **Step 1: cover-letter.ts 수정**

16~17행 (도구 안내 2줄) 제거:

```
AS-IS:
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument, readExternalDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

TO-BE:
(삭제)
```

- [ ] **Step 2: interview.ts 수정**

20행 (도구 안내 1줄) 제거:

```
AS-IS:
- 요약만으로 세부 내용이 필요하면 readDocument 또는 readExternalDocument 도구를 사용하세요.

TO-BE:
(삭제)
```

- [ ] **Step 3: 프롬프트 테스트 업데이트**

`tests/lib/ai/prompts/cover-letter.test.ts`와 `tests/lib/ai/prompts/interview.test.ts`를 읽고:
- `readDocument`, `readExternalDocument`, `readCareerNote`, `saveCareerNote` 문자열을 assert하는 테스트를 제거하거나 반전
- 예: `expect(prompt).toContain("readDocument")` → 해당 assertion 삭제
- 도구 안내가 **없음**을 확인하는 테스트 추가: `expect(prompt).not.toContain("도구")`

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/prompts/`
Expected: PASS

- [ ] **Step 5: Commit**

```
refactor(ai): 시스템 프롬프트에서 도구 안내 문구 제거
```

---

## Task 5: 파이프라인 단일화 — `compressIfNeeded`

**Files:**
- Rewrite: `lib/ai/pipeline/index.ts`
- Modify: `tests/lib/ai/pipeline/index.test.ts`

- [ ] **Step 1: 테스트 작성**

기존 `tests/lib/ai/pipeline/index.test.ts`를 읽고 `compressIfNeeded` 테스트로 교체:

```typescript
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/ai/tokens", () => ({
  countTokens: vi.fn(),
  getModelContextWindow: vi.fn(),
}))
vi.mock("@/lib/ai/pipeline/compress", () => ({
  compressMessages: vi.fn(),
}))

import { compressIfNeeded } from "@/lib/ai/pipeline"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"
import { compressMessages } from "@/lib/ai/pipeline/compress"

const mockModel = {} as any

describe("compressIfNeeded", () => {
  it("토큰이 50% 이하면 압축하지 않는다", async () => {
    vi.mocked(countTokens).mockReturnValue(40000)
    vi.mocked(getModelContextWindow).mockReturnValue(200000) // 50% = 100000

    const messages = [{ role: "user" as const, content: "hello" }]
    const result = await compressIfNeeded({
      model: mockModel, modelId: "test", provider: "openai",
      system: "sys", messages,
    })

    expect(result.messages).toBe(messages)
    expect(result.usage).toBeUndefined()
    expect(compressMessages).not.toHaveBeenCalled()
  })

  it("토큰이 50% 초과하면 압축한다", async () => {
    vi.mocked(countTokens).mockReturnValue(120000)
    vi.mocked(getModelContextWindow).mockReturnValue(200000) // 50% = 100000

    const compressed = [{ role: "user" as const, content: "compressed" }]
    const usage = { inputTokens: 100, outputTokens: 50 }
    vi.mocked(compressMessages).mockResolvedValue({ messages: compressed, usage })

    const result = await compressIfNeeded({
      model: mockModel, modelId: "test", provider: "openai",
      system: "sys", messages: [{ role: "user" as const, content: "hello" }],
    })

    expect(result.messages).toBe(compressed)
    expect(result.usage).toEqual(usage)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/ai/pipeline/index.test.ts`
Expected: FAIL — `compressIfNeeded` 없음

- [ ] **Step 3: 구현**

```typescript
// lib/ai/pipeline/index.ts
import type { LanguageModel } from "ai"
import type { AIProvider } from "@/types/ai"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"
import { compressMessages } from "./compress"

export { buildOnFinish } from "./on-finish"

const COMPRESS_THRESHOLD = 0.5

interface CompressIfNeededParams {
  model: LanguageModel
  modelId: string
  provider: AIProvider
  system: string
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
}

interface CompressIfNeededResult {
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function compressIfNeeded(
  params: CompressIfNeededParams,
): Promise<CompressIfNeededResult> {
  const totalTokens = countTokens(params.system, params.messages)
  const contextWindow = getModelContextWindow(params.provider, params.modelId)

  if (totalTokens > contextWindow * COMPRESS_THRESHOLD) {
    return compressMessages({ model: params.model, messages: params.messages })
  }

  return { messages: params.messages }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/ai/pipeline/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```
feat(ai): 단일 파이프라인 — compressIfNeeded 구현
```

---

## Task 6: Cover Letter 라우트 단순화

**Files:**
- Modify: `app/api/chat/cover-letter/route.ts`
- Modify: `tests/app/api/chat/cover-letter/route.test.ts`

- [ ] **Step 1: 라우트 핸들러 재작성**

`app/api/chat/cover-letter/route.ts` 변경사항:

**import 변경:**
```typescript
// AS-IS:
import { convertToModelMessages, type UIMessage } from "ai"
import { buildContext } from "@/lib/ai/context"
import { createReadDocumentTool, createReadExternalDocumentTool, createReadCareerNoteTool, createSaveCareerNoteTool } from "@/lib/ai/tools"
import { selectPipeline, handleMultiStep, handleClassification, coverLetterClassificationSchema, buildOnFinish } from "@/lib/ai/pipeline"

// TO-BE:
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { buildFullContext } from "@/lib/ai/context"
import { compressIfNeeded, buildOnFinish } from "@/lib/ai/pipeline"
```

**파이프라인 호출부 (127~182행) 전체 교체:**

```typescript
    // 압축 확인
    const { messages: finalMessages, usage: compressUsage } = await compressIfNeeded({
      model, modelId, provider: aiProvider, system, messages: modelMessages,
    })
    if (compressUsage) {
      recordUsage({
        userId: user.id, provider: aiProvider, model: modelId,
        feature: "COVER_LETTER",
        promptTokens: compressUsage.inputTokens,
        completionTokens: compressUsage.outputTokens,
        totalTokens: compressUsage.inputTokens + compressUsage.outputTokens,
        isServerKey, metadata: { conversationId },
      }).catch((e) => console.error("compress 토큰 기록 실패:", e))
    }

    // 응답 생성
    const result = streamText({ model, system, messages: finalMessages, onFinish })
    return result.toUIMessageStreamResponse()
```

**`buildContext` 호출 변경:**
```typescript
// AS-IS:
const [{ context, careerNoteCount, externalDocumentCount }, ...] = await Promise.all([
  buildContext(user.id, { ... }),
  ...
])

// TO-BE:
const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
  buildFullContext(user.id, {
    selectedDocumentIds,
    selectedExternalDocumentIds: allowedExternalDocIds,
    includeCareerNotes: true,
  }),
  getLanguageModel(user.id),
])
```

- [ ] **Step 2: 테스트 업데이트**

기존 `tests/app/api/chat/cover-letter/route.test.ts` 읽고 수정:
- `selectPipeline`, `handleMultiStep`, `handleClassification` 모킹 제거
- `buildContext` → `buildFullContext` 모킹 변경 (string 반환으로)
- 도구 관련 모킹 제거
- `streamText` 모킹 추가
- `compressIfNeeded` 모킹 추가
- 파이프라인 분기 테스트 → 단일 경로 테스트로 교체

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run tests/app/api/chat/cover-letter/route.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```
refactor(chat): cover-letter 라우트 단일 파이프라인으로 단순화
```

---

## Task 7: Interview 라우트 단순화

**Files:**
- Modify: `app/api/chat/interview/route.ts`
- Modify: `tests/app/api/chat/interview/route.test.ts`

- [ ] **Step 1: 라우트 핸들러 재작성**

Task 6과 동일한 패턴이지만 다음 차이점 주의:

**import 변경:**
```typescript
// AS-IS:
import { convertToModelMessages, type UIMessage } from "ai"
import { buildContext } from "@/lib/ai/context"
import { createReadDocumentTool, createReadExternalDocumentTool } from "@/lib/ai/tools"
import { selectPipeline, handleMultiStep, handleClassification, interviewClassificationSchema, buildOnFinish } from "@/lib/ai/pipeline"

// TO-BE:
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { buildFullContext } from "@/lib/ai/context"
import { compressIfNeeded, buildOnFinish } from "@/lib/ai/pipeline"
```

**`buildFullContext` 호출 — 커리어노트 미포함:**
```typescript
const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
  buildFullContext(user.id, {
    selectedDocumentIds: allowedDocIds,
    selectedExternalDocumentIds: allowedExternalDocIds,
    // includeCareerNotes 미전달 (기본값 undefined → false)
  }),
  getLanguageModel(user.id),
])
```

**파이프라인 호출부:** Task 6과 동일, feature만 `"INTERVIEW"`로 변경.

- [ ] **Step 2: 테스트 업데이트**

Task 6과 동일한 패턴으로 `tests/app/api/chat/interview/route.test.ts` 수정.

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run tests/app/api/chat/interview/route.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```
refactor(chat): interview 라우트 단일 파이프라인으로 단순화
```

---

## Task 8: 미사용 파일 및 테스트 삭제

**Files:** 삭제 대상 전체 (위 "삭제" 표 참조)

- [ ] **Step 1: 파이프라인 파일 삭제**

```bash
rm lib/ai/pipeline/classify.ts
rm lib/ai/pipeline/classification.ts
rm lib/ai/pipeline/multi-step.ts
rm lib/ai/pipeline/schema.ts
```

- [ ] **Step 2: 도구 디렉토리 삭제**

```bash
rm -r lib/ai/tools/
```

- [ ] **Step 3: 해당 테스트 파일 삭제**

```bash
rm tests/lib/ai/pipeline/classify.test.ts
rm tests/lib/ai/pipeline/classification.test.ts
rm tests/lib/ai/pipeline/multi-step.test.ts
rm tests/lib/ai/pipeline/schema.test.ts
rm -r tests/lib/ai/tools/
```

- [ ] **Step 4: 기존 context.ts buildContext 제거**

`lib/ai/context.ts`에서 `buildContext` 함수가 아직 남아있다면 제거. `buildFullContext`만 남긴다.

- [ ] **Step 5: import 누수 확인**

삭제된 파일을 import하는 코드가 남아있지 않은지 확인:

```bash
npx tsc --noEmit
```

Expected: PASS (누수 있으면 수정)

- [ ] **Step 6: Commit**

```
refactor(ai): classification, tool-calling 파이프라인 및 도구 제거
```

---

## Task 9: 최종 검증

- [ ] **Step 1: 전체 테스트**

```bash
npm test
```

Expected: ALL PASS

- [ ] **Step 2: Typecheck + Lint**

```bash
npm run typecheck && npm run lint
```

Expected: PASS

- [ ] **Step 3: 삭제 파일 import 검색**

삭제된 모듈 참조가 남아있지 않은지 최종 확인:

```bash
grep -r "from.*ai/tools" lib/ app/ --include="*.ts" --include="*.tsx"
grep -r "selectPipeline\|handleMultiStep\|handleClassification\|classificationSchema" lib/ app/ --include="*.ts"
grep -r "buildContext" lib/ app/ --include="*.ts"  # buildFullContext만 있어야 함
```

Expected: 결과 없음 (buildFullContext 참조만 허용)

- [ ] **Step 4: Commit (필요 시)**

남은 수정사항이 있으면 최종 커밋.
