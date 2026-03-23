# 도구 호출 판단력 벤치마크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시스템 프롬프트의 도구 호출 지시 방식(S1~S4)에 따라 LLM의 도구 호출 정확도가 어떻게 달라지는지 측정하는 벤치마크 구축

**Architecture:** `benchmarks/chat-pipeline/v1/common.ts`의 목업 데이터를 재사용하고, 4개 시나리오 × 4개 프롬프트 변형 = 16 runs를 `Promise.all`로 병렬 실행. pass 판정은 recall + precision + 순서 확인으로 자동화. 결과는 JSON(정성 평가 입력용) + TXT(사람 읽기용)로 저장.

**Tech Stack:** Vercel AI SDK (`generateText`, `tool`, `stepCountIs`), Zod, `@ai-sdk/openai`

**Spec:** `docs/superpowers/specs/2026-03-23-tool-calling-benchmark-design.md`

---

## File Structure

```
benchmarks/tool-calling/v1/
├── scenarios.ts    — 목업 데이터 재사용 + 4개 시나리오 + 기대 동작 정의
├── prompts.ts      — S1~S4 시스템 프롬프트 변형 + 공통 tool 정의
├── runner.ts       — 벤치마크 실행(병렬) + pass 판정 + 결과 수집/저장
├── openai.ts       — OpenAI 엔트리포인트 (--model 인자로 모델 선택)
├── README.md       — 벤치마크 설명, 실행 방법, 평가 기준
└── results/        — 결과 파일 (.gitkeep)
```

---

### Task 1: scenarios.ts — 시나리오 + 기대 동작 정의

**Files:**
- Create: `benchmarks/tool-calling/v1/scenarios.ts`

**의존성:** `benchmarks/chat-pipeline/v1/common.ts`의 `MOCK_DOCUMENTS`, `MOCK_CAREER_NOTES`, `CONV_STYLES`(polite)

- [ ] **Step 1: scenarios.ts 작성**

`MOCK_DOCUMENTS`, `MOCK_CAREER_NOTES`를 재사용하고, polite 대화의 앞 4쌍(8개 메시지)을 `BASE_CONVERSATION`으로 추출. 4개 시나리오를 정의하되, 각 시나리오에 마지막 사용자 메시지와 기대 도구 호출 목록, 허용되는 추가 도구 호출을 명시.

```typescript
/**
 * 도구 호출 판단력 벤치마크 — 시나리오 정의
 */

import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
} from "../../chat-pipeline/v1/common"

// polite 스타일의 앞 4쌍 (8개 메시지) — 공통 대화 히스토리
export const BASE_CONVERSATION: Array<{
  role: "user" | "assistant"
  content: string
}> = [
  {
    role: "user",
    content: "안녕하세요, 네이버 클라우드 지원하려고 합니다.",
  },
  {
    role: "assistant",
    content:
      "네, 네이버 클라우드 시니어 백엔드 개발자 포지션에 지원하시는군요! 채용공고와 참고자료를 확인해보겠습니다. 어떤 부분의 자기소개서를 먼저 작성할까요?",
  },
  {
    role: "user",
    content:
      "일단 전체적인 구조를 잡아주세요. 어떤 항목을 넣으면 좋을지 추천해주세요.",
  },
  {
    role: "assistant",
    content:
      "네이버 클라우드 채용공고를 보면 Kubernetes, MSA, 대규모 분산 시스템, 오픈소스 기여를 중시합니다. 다음 구조를 추천드립니다:\n\n1. 지원 동기\n2. 핵심 역량\n3. 프로젝트 경험\n4. 성장 가능성\n\n어떤 항목부터 시작할까요?",
  },
  {
    role: "user",
    content:
      "좋네요. 2번 핵심 역량부터 시작하죠. 제 Kubernetes 경험을 중심으로 써주세요.",
  },
  {
    role: "assistant",
    content:
      "Kubernetes 관련 경험을 정리해보겠습니다. deploy-ez에서 Docker + Kubernetes 자동 배포 경험, 경력기술서에 ArgoCD 기반 GitOps 파이프라인 경험이 있으시네요.",
  },
  {
    role: "user",
    content:
      "네, deploy-ez 프로젝트에서의 Kubernetes 경험과 회사에서의 경험을 합쳐서 하나의 스토리로 만들어주세요.",
  },
  {
    role: "assistant",
    content:
      "좋습니다. deploy-ez 오픈소스에서 시작된 K8s 자동화가 회사에서 12개 서비스 GitOps로 이어진 스토리로 작성하겠습니다.",
  },
]

// ---------------------------------------------------------------------------
// 시나리오 정의
// ---------------------------------------------------------------------------

export interface ToolCallExpectation {
  /** 반드시 호출해야 하는 도구 (recall) */
  required: string[]
  /** 호출해도 fail이 아닌 도구 (precision에서 제외) */
  allowed: string[]
  /** 순서가 중요한 경우: [먼저, 나중] 쌍 */
  orderedPairs: [string, string][]
}

export interface ToolCallingScenario {
  id: number
  label: string
  description: string
  lastUserMessage: string
  expected: ToolCallExpectation
}

export const SCENARIOS: ToolCallingScenario[] = [
  {
    id: 1,
    label: "새 경험",
    description: "문서에 없는 새로운 경험/수치 → saveCareerNote 생성",
    lastUserMessage:
      "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어",
    expected: {
      required: ["saveCareerNote"],
      allowed: [],
      orderedPairs: [],
    },
  },
  {
    id: 2,
    label: "수치 변경",
    description:
      "기존 커리어노트와 다른 수치 → readCareerNote 확인 후 saveCareerNote 갱신",
    lastUserMessage:
      "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어",
    expected: {
      required: ["readCareerNote", "saveCareerNote"],
      allowed: ["readDocument"],
      orderedPairs: [["readCareerNote", "saveCareerNote"]],
    },
  },
  {
    id: 3,
    label: "초안 요청",
    description:
      "구체적 문장 작성 요청 → readDocument로 전문 읽기",
    lastUserMessage:
      "deploy-ez 프로젝트 중심으로 핵심역량 써줘",
    expected: {
      required: ["readDocument"],
      allowed: ["readCareerNote"],
      orderedPairs: [],
    },
  },
  {
    id: 4,
    label: "단순 질문",
    description: "도구 호출 없이 답변 가능한 일반 질문",
    lastUserMessage: "자소서 분량은 보통 얼마나 돼?",
    expected: {
      required: [],
      allowed: [],
      orderedPairs: [],
    },
  },
]

// 목업 데이터 재수출
export { MOCK_DOCUMENTS, MOCK_CAREER_NOTES }
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit benchmarks/tool-calling/v1/scenarios.ts`
Note: tsconfig 범위 밖이면 import 확인만으로 충분. 다음 태스크에서 통합 확인.

- [ ] **Step 3: Commit**

```bash
git add benchmarks/tool-calling/v1/scenarios.ts
git commit -m "feat(benchmark): add tool-calling scenarios with expected tool calls"
```

---

### Task 2: prompts.ts — S1~S4 프롬프트 변형 + 도구 정의

**Files:**
- Create: `benchmarks/tool-calling/v1/prompts.ts`

**핵심:**
- S2는 `buildCoverLetterSystemPrompt`의 현재 출력을 정적 스냅샷으로 고정
- tool description은 프로덕션 코드(`lib/ai/tools/`)를 그대로 복제
- `context` 매개변수는 runner에서 주입

- [ ] **Step 1: prompts.ts 작성**

```typescript
/**
 * 도구 호출 판단력 벤치마크 — 프롬프트 변형 + 도구 정의
 */

import { tool } from "ai"
import { z } from "zod"
import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
} from "./scenarios"

// ---------------------------------------------------------------------------
// 공통: 참고자료 context 빌더
// ---------------------------------------------------------------------------

export function buildContext() {
  const docsSummary = MOCK_DOCUMENTS.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = MOCK_CAREER_NOTES.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}

// ---------------------------------------------------------------------------
// 프롬프트 변형
// ---------------------------------------------------------------------------

export interface PromptVariant {
  id: string
  label: string
  buildSystemPrompt: (context: string) => string
}

const JOB_POSTING_TEXT = MOCK_DOCUMENTS.find(
  (d) => d.id === "doc-3"
)!.extractedText

// S1: 최소 — 도구 호출 지시 없음
const S1: PromptVariant = {
  id: "S1",
  label: "최소",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 필요하면 도구로 전문을 읽으세요.

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S2: 현재 — buildCoverLetterSystemPrompt 정적 스냅샷
const S2: PromptVariant = {
  id: "S2",
  label: "현재",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S3: few-shot — S2 + 도구 호출 판단 예시 4개
const S3: PromptVariant = {
  id: "S3",
  label: "few-shot",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

[도구 호출 판단 예시]
- "작년에 AWS 마이그레이션 리드했어" → saveCareerNote 제안 (새 경험)
- "성능 개선은 40%가 아니라 60%였어" → readCareerNote 후 saveCareerNote 갱신 제안
- "핵심역량 써줘" → readDocument로 전문 읽기
- "고마워요" → 도구 호출 없음

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S4: 단계별 판단 — if/else 의사결정 트리
const S4: PromptVariant = {
  id: "S4",
  label: "단계별 판단",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

도구 호출 판단 기준:
1. 사용자가 문서에 없는 새 경험/성과/수치를 언급했는가? → saveCareerNote로 저장 제안
2. 기존 커리어노트와 다른 정보인가? → readCareerNote로 확인 후 saveCareerNote로 갱신 제안
3. 구체적 문장 작성이 필요한가? → readDocument로 전문 읽기
4. 위에 해당하지 않으면 → 도구 호출 없이 응답

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

export const PROMPT_VARIANTS: PromptVariant[] = [S1, S2, S3, S4]

// ---------------------------------------------------------------------------
// 도구 정의 (프로덕션 description/inputSchema 복제, execute는 mock)
// ---------------------------------------------------------------------------

export function createTools() {
  const readDocument = tool({
    description:
      "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      documentId: z.string().describe("읽을 문서의 ID"),
    }),
    execute: async ({ documentId }) => {
      const doc = MOCK_DOCUMENTS.find((d) => d.id === documentId)
      if (!doc) return "문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.extractedText}`
    },
  })

  const readCareerNote = tool({
    description:
      "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().describe("읽을 커리어노트의 ID"),
    }),
    execute: async ({ careerNoteId }) => {
      const note = MOCK_CAREER_NOTES.find(
        (n) => n.id === careerNoteId
      )
      if (!note) return "커리어노트를 찾을 수 없습니다."
      return `[${note.title}]\n${note.content}`
    },
  })

  const saveCareerNote = tool({
    description:
      "커리어노트를 생성하거나 갱신합니다. 반드시 사용자에게 먼저 제안하고 승인을 받은 후 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z
        .string()
        .optional()
        .describe("갱신할 커리어노트 ID. 없으면 새로 생성"),
      title: z.string().describe("커리어노트 제목"),
      content: z.string().describe("커리어노트 내용"),
      summary: z.string().describe("1~2줄 핵심 요약"),
      metadata: z
        .object({
          role: z.string().optional(),
          result: z.string().optional(),
          feeling: z.string().optional(),
        })
        .optional()
        .describe("메타데이터"),
    }),
    execute: async ({ title }) =>
      `커리어노트 "${title}"이(가) 저장되었습니다.`,
  })

  return { readDocument, readCareerNote, saveCareerNote }
}
```

- [ ] **Step 2: Commit**

```bash
git add benchmarks/tool-calling/v1/prompts.ts
git commit -m "feat(benchmark): add S1-S4 prompt variants and tool definitions"
```

---

### Task 3: runner.ts — 벤치마크 실행 + pass 판정 + 결과 저장

**Files:**
- Create: `benchmarks/tool-calling/v1/runner.ts`
- Create: `benchmarks/tool-calling/v1/results/.gitkeep`

**핵심 로직:**
- 16 runs를 `Promise.all`로 병렬 실행
- pass 판정: recall + precision + 순서(시나리오 2)
- API 실패 시 1회 재시도
- 결과를 JSON + TXT로 저장

- [ ] **Step 1: runner.ts 작성**

```typescript
/**
 * 도구 호출 판단력 벤치마크 — 실행 + 판정 + 결과 저장
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { generateText, stepCountIs } from "ai"
import type { LanguageModel } from "ai"

import {
  SCENARIOS,
  BASE_CONVERSATION,
  type ToolCallingScenario,
  type ToolCallExpectation,
} from "./scenarios"
import {
  PROMPT_VARIANTS,
  buildContext,
  createTools,
  type PromptVariant,
} from "./prompts"

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  model: string
  scenario: string
  promptVariant: string
  toolCalls: string[]
  expectedTools: string[]
  pass: boolean
  inputTokens: number
  outputTokens: number
  durationMs: number
  responseFull: string
  error?: string
}

export interface BenchmarkOutput {
  meta: {
    model: string
    timestamp: string
    totalRuns: number
  }
  results: BenchmarkResult[]
}

// ---------------------------------------------------------------------------
// pass 판정
// ---------------------------------------------------------------------------

interface ToolCallRecord {
  toolName: string
  stepIndex: number
}

function judgePass(
  calls: ToolCallRecord[],
  expected: ToolCallExpectation
): boolean {
  const calledNames = calls.map((c) => c.toolName)

  // Recall: 기대 도구를 모두 호출했는가
  for (const req of expected.required) {
    if (!calledNames.includes(req)) return false
  }

  // Precision: 기대하지 않은 도구를 호출하지 않았는가
  const acceptableTools = new Set([
    ...expected.required,
    ...expected.allowed,
  ])
  for (const name of calledNames) {
    if (!acceptableTools.has(name)) return false
  }

  // 순서 확인: orderedPairs의 [먼저, 나중] 쌍
  for (const [first, second] of expected.orderedPairs) {
    const firstCall = calls.find((c) => c.toolName === first)
    const secondCall = calls.find((c) => c.toolName === second)
    if (!firstCall || !secondCall) return false
    // 같은 step이면 fail (병렬 호출 = 순서 보장 없음)
    if (firstCall.stepIndex >= secondCall.stepIndex) return false
  }

  // 시나리오 4(기대 도구 없음): 도구가 호출되지 않아야 pass
  if (
    expected.required.length === 0 &&
    expected.allowed.length === 0 &&
    calledNames.length > 0
  ) {
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// 단일 run 실행
// ---------------------------------------------------------------------------

async function runSingle(
  model: LanguageModel,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  const context = buildContext()
  const systemPrompt = variant.buildSystemPrompt(context)
  const tools = createTools()

  const messages = [
    ...BASE_CONVERSATION.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: scenario.lastUserMessage },
  ]

  const start = Date.now()

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools,
    temperature: 0,
    stopWhen: stepCountIs(10),
  })

  const duration = Date.now() - start

  // 도구 호출 추출 (stepIndex 포함)
  const callRecords: ToolCallRecord[] = []
  const callStrings: string[] = []

  for (let i = 0; i < result.steps.length; i++) {
    const step = result.steps[i]
    for (const tc of step.toolCalls ?? []) {
      const args = tc.input ?? (tc as any).args ?? {}
      callRecords.push({ toolName: tc.toolName, stepIndex: i })
      callStrings.push(`${tc.toolName}(${JSON.stringify(args)})`)
    }
  }

  // 토큰 합산
  let inputTokens = 0
  let outputTokens = 0
  for (const step of result.steps) {
    inputTokens += step.usage?.inputTokens ?? 0
    outputTokens += step.usage?.outputTokens ?? 0
  }

  const pass = judgePass(callRecords, scenario.expected)

  return {
    model: model.modelId,
    scenario: scenario.label,
    promptVariant: variant.id,
    toolCalls: callStrings,
    expectedTools: scenario.expected.required,
    pass,
    inputTokens,
    outputTokens,
    durationMs: duration,
    responseFull: result.text,
  }
}

// ---------------------------------------------------------------------------
// 재시도 래퍼 (1회)
// ---------------------------------------------------------------------------

async function runWithRetry(
  model: LanguageModel,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  try {
    return await runSingle(model, scenario, variant)
  } catch (err) {
    console.warn(
      `  ⚠ ${variant.id}/${scenario.label} 실패, 재시도...`
    )
    try {
      return await runSingle(model, scenario, variant)
    } catch (retryErr) {
      const errorMsg =
        retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error(
        `  ✗ ${variant.id}/${scenario.label} 재시도 실패: ${errorMsg}`
      )
      return {
        model: model.modelId,
        scenario: scenario.label,
        promptVariant: variant.id,
        toolCalls: [],
        expectedTools: scenario.expected.required,
        pass: false,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: 0,
        responseFull: "",
        error: errorMsg,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 결과 저장
// ---------------------------------------------------------------------------

const RESULTS_DIR = path.join(
  "benchmarks",
  "tool-calling",
  "v1",
  "results"
)

function getTimestamp() {
  return new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[T:]/g, "-")
}

function saveJson(results: BenchmarkResult[], modelId: string) {
  const timestamp = getTimestamp()
  const modelSuffix = modelId.replace(/[/.]/g, "-")
  const filePath = path.join(
    RESULTS_DIR,
    `benchmark-result-${timestamp}_${modelSuffix}.json`
  )

  const output: BenchmarkOutput = {
    meta: {
      model: modelId,
      timestamp: new Date().toISOString(),
      totalRuns: results.length,
    },
    results,
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8")
  console.log(`\n📄 JSON 결과 저장: ${filePath}`)
  return filePath
}

function saveTxt(results: BenchmarkResult[], modelId: string) {
  const timestamp = getTimestamp()
  const modelSuffix = modelId.replace(/[/.]/g, "-")
  const filePath = path.join(
    RESULTS_DIR,
    `benchmark-result-${timestamp}_${modelSuffix}.txt`
  )

  let report = ""
  report += "=".repeat(70) + "\n"
  report += "  도구 호출 판단력 벤치마크 결과\n"
  report += `  모델: ${modelId}\n`
  report += `  실행 시간: ${new Date().toISOString()}\n`
  report += `  총 실행: ${results.length}건\n`
  report += "=".repeat(70) + "\n\n"

  // 프롬프트 변형별 pass rate 요약
  report += "[프롬프트 변형별 Pass Rate]\n"
  for (const variant of PROMPT_VARIANTS) {
    const variantResults = results.filter(
      (r) => r.promptVariant === variant.id
    )
    const passCount = variantResults.filter((r) => r.pass).length
    report += `  ${variant.id} (${variant.label}): ${passCount}/${variantResults.length}\n`
  }
  report += "\n"

  // 시나리오별 pass rate 요약
  report += "[시나리오별 Pass Rate]\n"
  for (const scenario of SCENARIOS) {
    const scenarioResults = results.filter(
      (r) => r.scenario === scenario.label
    )
    const passCount = scenarioResults.filter((r) => r.pass).length
    report += `  ${scenario.id}. ${scenario.label}: ${passCount}/${scenarioResults.length}\n`
  }
  report += "\n"

  // 상세 결과
  report += "=".repeat(70) + "\n"
  report += "  상세 결과\n"
  report += "=".repeat(70) + "\n\n"

  for (const r of results) {
    report += "-".repeat(50) + "\n"
    report += `시나리오: ${r.scenario} | 프롬프트: ${r.promptVariant}\n`
    report += `결과: ${r.pass ? "✅ PASS" : "❌ FAIL"}${r.error ? ` (에러: ${r.error})` : ""}\n`
    report += `기대 도구: [${r.expectedTools.join(", ")}]\n`
    report += `실제 도구: [${r.toolCalls.join(", ")}]\n`
    report += `토큰: 입력 ${r.inputTokens} + 출력 ${r.outputTokens}\n`
    report += `시간: ${r.durationMs}ms\n\n`
    report += "[응답 전문]\n"
    report += r.responseFull || "(없음)"
    report += "\n\n"
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  fs.writeFileSync(filePath, report, "utf-8")
  console.log(`📄 TXT 결과 저장: ${filePath}`)
  return filePath
}

// ---------------------------------------------------------------------------
// 메인 실행
// ---------------------------------------------------------------------------

export interface ModelConfig {
  provider: string
  modelId: string
  create: () => LanguageModel
}

export async function runBenchmark(modelConfig: ModelConfig) {
  const model = modelConfig.create()
  const modelLabel = `${modelConfig.provider}/${modelConfig.modelId}`

  console.log("=".repeat(70))
  console.log("  도구 호출 판단력 벤치마크")
  console.log(`  모델: ${modelLabel}`)
  console.log(
    `  시나리오: ${SCENARIOS.length}개 × 프롬프트: ${PROMPT_VARIANTS.length}개 = ${SCENARIOS.length * PROMPT_VARIANTS.length} runs`
  )
  console.log("=".repeat(70))
  console.log()

  // 4시나리오 × 4프롬프트 = 16 runs 병렬 실행
  const runs: Array<{
    scenario: ToolCallingScenario
    variant: PromptVariant
    promise: Promise<BenchmarkResult>
  }> = []

  for (const scenario of SCENARIOS) {
    for (const variant of PROMPT_VARIANTS) {
      console.log(`  ▶ ${variant.id}/${scenario.label} 실행 중...`)
      runs.push({
        scenario,
        variant,
        promise: runWithRetry(model, scenario, variant),
      })
    }
  }

  const results = await Promise.all(runs.map((r) => r.promise))

  // 콘솔 요약 출력
  console.log("\n" + "=".repeat(70))
  console.log("  결과 요약")
  console.log("=".repeat(70) + "\n")

  // 매트릭스 형태로 출력
  const header = ["시나리오", ...PROMPT_VARIANTS.map((v) => v.id)]
  console.log("  " + header.map((h) => h.padEnd(12)).join(""))

  for (const scenario of SCENARIOS) {
    const row = [scenario.label]
    for (const variant of PROMPT_VARIANTS) {
      const r = results.find(
        (r) => r.scenario === scenario.label && r.promptVariant === variant.id
      )
      row.push(r?.pass ? "✅ PASS" : r?.error ? "⚠ ERROR" : "❌ FAIL")
    }
    console.log("  " + row.map((c) => c.padEnd(12)).join(""))
  }

  // pass rate
  const totalPass = results.filter((r) => r.pass).length
  console.log(
    `\n  전체 Pass Rate: ${totalPass}/${results.length} (${((totalPass / results.length) * 100).toFixed(1)}%)`
  )
  console.log()

  // 파일 저장
  saveJson(results, modelConfig.modelId)
  saveTxt(results, modelConfig.modelId)

  return results
}
```

- [ ] **Step 2: results/.gitkeep 생성**

```bash
mkdir -p benchmarks/tool-calling/v1/results
touch benchmarks/tool-calling/v1/results/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add benchmarks/tool-calling/v1/runner.ts benchmarks/tool-calling/v1/results/.gitkeep
git commit -m "feat(benchmark): add tool-calling runner with pass judgment and result output"
```

---

### Task 4: openai.ts — OpenAI 엔트리포인트

**Files:**
- Create: `benchmarks/tool-calling/v1/openai.ts`

- [ ] **Step 1: openai.ts 작성**

```typescript
/**
 * 도구 호출 판단력 벤치마크 — OpenAI
 *
 * 사용법:
 *   npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4
 *   npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4-nano
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { createOpenAI } from "@ai-sdk/openai"
import { runBenchmark, type ModelConfig } from "./runner"

// ---------------------------------------------------------------------------
// CLI 인자 파싱
// ---------------------------------------------------------------------------

const modelArg = process.argv.find((_, i, arr) => arr[i - 1] === "--model")
if (!modelArg) {
  console.error("사용법: npx tsx benchmarks/tool-calling/v1/openai.ts --model <model-id>")
  console.error("예시: --model gpt-5.4")
  process.exit(1)
}

// ---------------------------------------------------------------------------

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OPENAI_API_KEY가 설정되지 않았습니다.")
  process.exit(1)
}

const openai = createOpenAI({ apiKey })

const modelConfig: ModelConfig = {
  provider: "openai",
  modelId: modelArg,
  create: () => openai(modelArg),
}

runBenchmark(modelConfig).catch(console.error)
```

- [ ] **Step 2: Commit**

```bash
git add benchmarks/tool-calling/v1/openai.ts
git commit -m "feat(benchmark): add OpenAI entry point with --model CLI arg"
```

---

### Task 5: README.md

**Files:**
- Create: `benchmarks/tool-calling/v1/README.md`

- [ ] **Step 1: README.md 작성**

```markdown
# 도구 호출 판단력 벤치마크 (v1)

시스템 프롬프트의 도구 호출 지시 방식에 따라 LLM의 도구 호출 정확도가 어떻게 달라지는지 측정한다.

## 비교 대상

| 변형 | 스타일 | 설명 |
|------|--------|------|
| S1 | 최소 | 도구 호출 지시 없음 |
| S2 | 현재 | buildCoverLetterSystemPrompt 현재 버전 |
| S3 | few-shot | S2 + 도구 호출 판단 예시 4개 |
| S4 | 단계별 판단 | if/else 의사결정 트리 형태 |

## 시나리오

| # | 상황 | 기대 도구 호출 |
|---|------|---------------|
| 1 | 새 경험 언급 | saveCareerNote |
| 2 | 수치 변경 | readCareerNote → saveCareerNote |
| 3 | 초안 요청 | readDocument |
| 4 | 단순 질문 | 없음 |

## 실행

```bash
# 단일 모델
npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4

# Claude Code 서브에이전트 병렬 디스패치
# 에이전트 1: --model gpt-5.4
# 에이전트 2: --model gpt-5.4-nano
```

API 키: `.env.local`의 `OPENAI_API_KEY`

## Pass 판정

- **Recall**: 기대 도구를 모두 호출했는가
- **Precision**: 기대하지 않은 도구를 호출하지 않았는가
- **순서** (시나리오 2): readCareerNote가 saveCareerNote보다 이전 step에 있어야 함

## 결과

`results/` 디렉토리에 JSON + TXT 형식으로 저장.

- JSON: 정성 평가 입력용 (원시 데이터)
- TXT: 사람이 읽을 수 있는 요약 + 응답 전문
```

- [ ] **Step 2: Commit**

```bash
git add benchmarks/tool-calling/v1/README.md
git commit -m "docs(benchmark): add tool-calling benchmark README"
```

---

### Task 6: 통합 검증 — TypeScript 컴파일 + 실행

- [ ] **Step 1: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit --esModuleInterop --moduleResolution node --module esnext --target esnext benchmarks/tool-calling/v1/openai.ts`

참고: tsconfig 범위 밖이므로 직접 플래그 지정. 에러 있으면 수정.

- [ ] **Step 2: 서브에이전트 병렬 디스패치로 실행**

Agent 1: `npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4`
Agent 2: `npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4-nano`

- [ ] **Step 3: 결과 확인**

`benchmarks/tool-calling/v1/results/`에 JSON + TXT 파일 생성 확인.

- [ ] **Step 4: 정성 평가 (Claude Code opus-4-6, effort: high)**

결과 JSON + TXT를 읽고 `benchmarks/tool-calling/v1/report.md` 작성:
- 프롬프트 변형별 pass rate 비교
- 모델별 차이
- 시나리오별 난이도 분석
- 최적 프롬프트 변형 추천
- false positive/negative 패턴 분석
