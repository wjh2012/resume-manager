// benchmarks/lib/providers/anthropic.ts
import { generateText, dynamicTool, jsonSchema, stepCountIs } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import Anthropic from "@anthropic-ai/sdk"
import type { ModelMessage, ToolSet, StepResult } from "ai"
import type { JSONSchema7 } from "@ai-sdk/provider"

import type {
  BenchmarkProvider,
  BenchmarkRequest,
  BenchmarkResponse,
  BenchmarkToolDef,
  BenchmarkToolCall,
  BenchmarkMessage,
} from "./types"

// ---------------------------------------------------------------------------
// 클라이언트 팩토리
// ---------------------------------------------------------------------------

function getAiSdkClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
  return createAnthropic({ apiKey })
}

function getNativeSdkClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
  return new Anthropic({ apiKey })
}

// ---------------------------------------------------------------------------
// 도구 변환 헬퍼 (Vercel AI SDK)
// ---------------------------------------------------------------------------

/**
 * BenchmarkToolDef[] → Vercel AI SDK dynamicTool 맵
 * JSON Schema parameters를 jsonSchema()로 감싸서 inputSchema로 전달
 */
function convertTools(defs: BenchmarkToolDef[]): ToolSet {
  const result: ToolSet = {}
  for (const def of defs) {
    result[def.name] = dynamicTool({
      description: def.description,
      inputSchema: jsonSchema(def.parameters as JSONSchema7),
      execute: async (input: unknown) => input,
    })
  }
  return result
}

/**
 * AI SDK steps → BenchmarkToolCall[]
 * TypedToolCall은 staticToolCall(TOOLS) | DynamicToolCall 유니온이며
 * 둘 다 toolName, input 프로퍼티를 갖는다.
 */
function extractToolCalls(steps: StepResult<ToolSet>[]): BenchmarkToolCall[] {
  const calls: BenchmarkToolCall[] = []
  for (const step of steps) {
    for (const tc of step.toolCalls) {
      calls.push({
        name: tc.toolName,
        args: (tc.input as Record<string, unknown>) ?? {},
      })
    }
  }
  return calls
}

// ---------------------------------------------------------------------------
// 메시지 변환 (Vercel AI SDK용)
// ---------------------------------------------------------------------------

function convertMessagesForAiSdk(messages: BenchmarkMessage[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    if (msg.role === "tool") {
      return {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.toolCallId,
            toolName: "",
            output: { type: "text", value: msg.content },
          },
        ],
      }
    }
    return { role: msg.role, content: msg.content }
  })
}

// ---------------------------------------------------------------------------
// 메시지 변환 (Native Anthropic SDK용)
// ---------------------------------------------------------------------------

function convertMessagesForNativeSdk(
  messages: BenchmarkMessage[]
): Anthropic.MessageParam[] {
  return messages.map((msg): Anthropic.MessageParam => {
    if (msg.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.toolCallId,
            content: msg.content,
          },
        ],
      }
    }
    return { role: msg.role, content: msg.content }
  })
}

// ---------------------------------------------------------------------------
// run — 실시간 모드 (Vercel AI SDK)
// ---------------------------------------------------------------------------

async function run(req: BenchmarkRequest): Promise<BenchmarkResponse> {
  const anthropic = getAiSdkClient()
  const model = anthropic(req.model)

  const tools = req.tools && req.tools.length > 0 ? convertTools(req.tools) : undefined
  const messages = convertMessagesForAiSdk(req.messages)
  const maxSteps = req.maxSteps ?? 5

  const start = Date.now()
  const result = await generateText({
    model,
    system: req.system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
  })
  const durationMs = Date.now() - start

  const toolCalls = extractToolCalls(result.steps as StepResult<ToolSet>[])

  // 토큰 집계 (모든 step 합산)
  let inputTokens = 0
  let outputTokens = 0
  for (const step of result.steps) {
    inputTokens += step.usage?.inputTokens ?? 0
    outputTokens += step.usage?.outputTokens ?? 0
  }

  return {
    id: req.id,
    model: req.model,
    text: result.text,
    toolCalls,
    inputTokens,
    outputTokens,
    durationMs,
  }
}

// ---------------------------------------------------------------------------
// runBatch — 배치 모드 (Native Anthropic SDK)
// ---------------------------------------------------------------------------

const BATCH_POLL_INITIAL_MS = 30_000
const BATCH_POLL_BACKOFF = 1.5
const BATCH_POLL_MAX_MS = 120_000
const BATCH_TOTAL_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2h

async function runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]> {
  const client = getNativeSdkClient()

  // 요청 목록 구성
  const requests: Anthropic.Messages.BatchCreateParams.Request[] = reqs.map((req) => ({
    custom_id: req.id,
    params: {
      model: req.model,
      max_tokens: 4096,
      system: req.system,
      messages: convertMessagesForNativeSdk(req.messages),
      tools:
        req.tools && req.tools.length > 0
          ? req.tools.map((def) => ({
              name: def.name,
              description: def.description,
              input_schema: def.parameters as Anthropic.Tool.InputSchema,
            }))
          : undefined,
    },
  }))

  // 배치 생성
  const batch = await client.messages.batches.create({ requests })
  const batchId = batch.id

  // 폴링
  const pollStart = Date.now()
  let pollIntervalMs = BATCH_POLL_INITIAL_MS

  while (true) {
    if (Date.now() - pollStart > BATCH_TOTAL_TIMEOUT_MS) {
      throw new Error(`Anthropic Batch ${batchId} 타임아웃 (2h 초과)`)
    }

    await new Promise((res) => setTimeout(res, pollIntervalMs))
    pollIntervalMs = Math.min(pollIntervalMs * BATCH_POLL_BACKOFF, BATCH_POLL_MAX_MS)

    const status = await client.messages.batches.retrieve(batchId)
    if (status.processing_status !== "ended") continue

    // 결과 수집
    const responses: BenchmarkResponse[] = []
    const decoder = await client.messages.batches.results(batchId)

    for await (const item of decoder) {
      const customId = item.custom_id
      const req = reqs.find((r) => r.id === customId)
      const itemResult = item.result

      if (itemResult.type === "errored") {
        process.stderr.write(
          `[anthropic batch] ${customId} errored: ${JSON.stringify(itemResult.error)}\n`
        )
        continue
      }

      if (itemResult.type === "canceled" || itemResult.type === "expired") {
        process.stderr.write(`[anthropic batch] ${customId} ${itemResult.type}\n`)
        continue
      }

      // succeeded
      const message = itemResult.message

      let text = ""
      const toolCalls: BenchmarkToolCall[] = []

      for (const block of message.content) {
        if (block.type === "text") {
          text += block.text
        } else if (block.type === "tool_use") {
          toolCalls.push({
            name: block.name,
            args: block.input as Record<string, unknown>,
          })
        }
      }

      responses.push({
        id: customId,
        model: req?.model ?? message.model,
        text,
        toolCalls,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        durationMs: 0, // 배치 모드에서는 개별 duration 측정 불가
      })
    }

    return responses
  }
}

// ---------------------------------------------------------------------------
// 내보내기
// ---------------------------------------------------------------------------

export const anthropicProvider: BenchmarkProvider = {
  name: "anthropic",
  run,
  runBatch,
}
