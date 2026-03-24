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
  proposalDetected: boolean
  turn2Executed: boolean
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

export function judgePass(
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
// 제안 인식 (보조 지표)
// ---------------------------------------------------------------------------

const PROPOSAL_PATTERNS: Record<string, RegExp[]> = {
  saveCareerNote: [
    /커리어노트.{0,20}(저장|기록|생성|추가|갱신|업데이트|수정|반영)/,
    /(저장|기록|생성|추가|갱신|업데이트).{0,20}커리어노트/,
    /노트.{0,10}(저장|남겨|기록)/,
    /(저장|기록).{0,10}(해둘|해놓|해드릴|할까|할게|하겠)/,
  ],
  readDocument: [
    /(문서|전문|원문).{0,20}(읽|확인|조회|살펴)/,
    /(상세|구체적|자세).{0,20}(확인|읽|조회)/,
  ],
  readCareerNote: [
    /커리어노트.{0,20}(읽|확인|조회|비교)/,
    /(기존|현재).{0,20}(노트|기록).{0,20}(확인|비교)/,
  ],
}

export function detectProposal(responseText: string, expectedTools: string[]): boolean {
  if (expectedTools.length === 0) return false
  for (const toolName of expectedTools) {
    const patterns = PROPOSAL_PATTERNS[toolName]
    if (!patterns) continue
    if (patterns.some((p) => p.test(responseText))) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// 단일 run 실행
// ---------------------------------------------------------------------------

export function extractCalls(steps: any[]) {
  const records: ToolCallRecord[] = []
  const strings: string[] = []
  for (let i = 0; i < steps.length; i++) {
    for (const tc of steps[i].toolCalls ?? []) {
      const args = tc.input ?? (tc as any).args ?? {}
      records.push({ toolName: tc.toolName, stepIndex: i })
      strings.push(`${tc.toolName}(${JSON.stringify(args)})`)
    }
  }
  return { records, strings }
}

export function sumTokens(steps: any[]) {
  let input = 0
  let output = 0
  for (const step of steps) {
    input += step.usage?.inputTokens ?? 0
    output += step.usage?.outputTokens ?? 0
  }
  return { input, output }
}

export async function runSingle(
  model: LanguageModel,
  modelId: string,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  const context = buildContext()
  const systemPrompt = variant.buildSystemPrompt(context)
  const tools = createTools()

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...BASE_CONVERSATION.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: scenario.lastUserMessage },
  ]

  const start = Date.now()

  // --- Turn 1 ---
  const turn1 = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools,
    temperature: 0,
    stopWhen: stepCountIs(10),
  })

  const turn1Calls = extractCalls(turn1.steps)
  const turn1Tokens = sumTokens(turn1.steps)
  const proposalDetected = detectProposal(turn1.text, scenario.expected.required)

  let allCallRecords = turn1Calls.records
  let allCallStrings = [...turn1Calls.strings]
  let totalInput = turn1Tokens.input
  let totalOutput = turn1Tokens.output
  let responseFull = turn1.text
  let turn2Executed = false

  // --- Turn 2 (2턴 시나리오: saveCareerNote 미호출 + 제안 감지 시 승인 턴) ---
  const hasSaveCall = turn1Calls.records.some(
    (r) => r.toolName === "saveCareerNote"
  )

  if (scenario.approvalMessage && !hasSaveCall && proposalDetected) {
    turn2Executed = true
    const stepOffset = turn1.steps.length

    // Turn1 응답 + 승인 메시지를 대화에 추가
    const turn2Messages = [
      ...messages,
      { role: "assistant" as const, content: turn1.text },
      { role: "user" as const, content: scenario.approvalMessage },
    ]

    const turn2 = await generateText({
      model,
      system: systemPrompt,
      messages: turn2Messages,
      tools,
      temperature: 0,
      stopWhen: stepCountIs(10),
    })

    const turn2Calls = extractCalls(turn2.steps)
    const turn2Tokens = sumTokens(turn2.steps)

    // Turn2 호출의 stepIndex를 offset하여 순서 판정에 반영
    for (const rec of turn2Calls.records) {
      allCallRecords.push({
        toolName: rec.toolName,
        stepIndex: rec.stepIndex + stepOffset,
      })
    }
    allCallStrings.push(`[승인: "${scenario.approvalMessage}"]`)
    allCallStrings.push(...turn2Calls.strings)

    totalInput += turn2Tokens.input
    totalOutput += turn2Tokens.output
    responseFull += `\n\n--- [Turn 2: 승인 후] ---\n\n${turn2.text}`
  }

  const duration = Date.now() - start
  const pass = judgePass(allCallRecords, scenario.expected)

  return {
    model: modelId,
    scenario: scenario.label,
    promptVariant: variant.id,
    toolCalls: allCallStrings,
    expectedTools: scenario.expected.required,
    pass,
    proposalDetected,
    turn2Executed,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    durationMs: duration,
    responseFull,
  }
}

// ---------------------------------------------------------------------------
// 재시도 래퍼 (1회)
// ---------------------------------------------------------------------------

export async function runWithRetry(
  model: LanguageModel,
  modelId: string,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  try {
    return await runSingle(model, modelId, scenario, variant)
  } catch (err) {
    console.warn(
      `  ⚠ ${variant.id}/${scenario.label} 실패, 재시도...`
    )
    try {
      return await runSingle(model, modelId, scenario, variant)
    } catch (retryErr) {
      const errorMsg =
        retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error(
        `  ✗ ${variant.id}/${scenario.label} 재시도 실패: ${errorMsg}`
      )
      return {
        model: modelId,
        scenario: scenario.label,
        promptVariant: variant.id,
        toolCalls: [],
        expectedTools: scenario.expected.required,
        pass: false,
        proposalDetected: false,
        turn2Executed: false,
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

  // 제안 인식 보조 지표
  report += "[제안 인식 (도구 미호출이지만 텍스트로 제안한 경우)]\n"
  const failedResults = results.filter((r) => !r.pass && !r.error)
  const proposalCount = failedResults.filter((r) => r.proposalDetected).length
  report += `  FAIL 중 제안 감지: ${proposalCount}/${failedResults.length}\n\n`

  // 상세 결과
  report += "=".repeat(70) + "\n"
  report += "  상세 결과\n"
  report += "=".repeat(70) + "\n\n"

  for (const r of results) {
    report += "-".repeat(50) + "\n"
    report += `시나리오: ${r.scenario} | 프롬프트: ${r.promptVariant}\n`
    const flags = [
      r.proposalDetected ? "💬 제안" : "",
      r.turn2Executed ? "🔄 2턴" : "",
      r.error ? `에러: ${r.error}` : "",
    ].filter(Boolean).join(", ")
    report += `결과: ${r.pass ? "✅ PASS" : "❌ FAIL"}${flags ? ` (${flags})` : ""}\n`
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
        promise: runWithRetry(model, modelConfig.modelId, scenario, variant),
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
      row.push(
        r?.pass
          ? r?.turn2Executed ? "✅ 2턴" : "✅ PASS"
          : r?.error ? "⚠ ERROR"
          : r?.proposalDetected ? "❌ 💬"
          : "❌ FAIL"
      )
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
