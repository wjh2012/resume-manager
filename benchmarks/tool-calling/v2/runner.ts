/**
 * 도구 호출 강제 패턴 벤치마크 v2 — 실행 + 결과 저장
 *
 * v1의 판정 로직(judgePass, runSingle 등)을 재사용하고,
 * v2 전용 프롬프트 변형(S4, S5)과 결과 디렉토리를 사용한다.
 */

import * as fs from "node:fs"
import * as path from "node:path"

import {
  SCENARIOS,
  type ToolCallingScenario,
} from "../v1/scenarios"
import { generateText, stepCountIs } from "ai"
import type { LanguageModel } from "ai"

import {
  runWithRetry,
  judgePass,
  detectProposal,
  extractCalls,
  sumTokens,
  type BenchmarkResult,
  type BenchmarkOutput,
  type ModelConfig,
} from "../v1/runner"
import {
  BASE_CONVERSATION,
} from "../v1/scenarios"
import {
  PROMPT_VARIANTS,
  PRECHECK_VARIANT_IDS,
  type PromptVariant,
  buildContext,
  createTools,
} from "./prompts"
import { classifyMessage, generateTurn2Hint } from "./precheck"

// ---------------------------------------------------------------------------
// 결과 저장
// ---------------------------------------------------------------------------

const RESULTS_DIR = path.join(
  "benchmarks",
  "tool-calling",
  "v2",
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
  report += "  도구 호출 강제 패턴 벤치마크 v2 결과\n"
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

  // 변형 간 직접 비교 (single-model per runBenchmark call)
  const variantIds = PROMPT_VARIANTS.map((v) => v.id)
  report += `[변형 간 직접 비교]\n`
  for (const scenario of SCENARIOS) {
    const statuses = variantIds.map((id) => {
      const r = results.find(
        (r) => r.scenario === scenario.label && r.promptVariant === id
      )
      return r?.pass ? "✅" : r?.error ? "⚠" : "❌"
    })
    report += `  ${scenario.label}: ${variantIds.map((id, i) => `${id} ${statuses[i]}`).join("  ")}\n`
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
// Pre-check 통합 runSingle (S6 전용)
// ---------------------------------------------------------------------------

async function runSingleWithPrecheck(
  model: LanguageModel,
  modelId: string,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  const context = buildContext()
  const baseSystemPrompt = variant.buildSystemPrompt(context)
  const tools = createTools()

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...BASE_CONVERSATION.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: scenario.lastUserMessage },
  ]

  // --- Turn 1 Pre-check: 사용자 메시지 분류 → 동적 힌트 ---
  const precheck = classifyMessage(scenario.lastUserMessage, context)
  const turn1System = precheck.hint
    ? `${baseSystemPrompt}\n\n${precheck.hint}`
    : baseSystemPrompt

  const start = Date.now()

  // --- Turn 1 ---
  const turn1 = await generateText({
    model,
    system: turn1System,
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

  // --- Turn 2 (승인 턴) ---
  const hasSaveCall = turn1Calls.records.some(
    (r) => r.toolName === "saveCareerNote"
  )

  if (scenario.approvalMessage && !hasSaveCall && proposalDetected) {
    turn2Executed = true
    const stepOffset = turn1.steps.length

    // Turn 2 Pre-check: 승인 후 힌트 주입
    const turn2Hint = generateTurn2Hint()
    const turn2System = `${baseSystemPrompt}\n\n${turn2Hint}`

    const turn2Messages = [
      ...messages,
      { role: "assistant" as const, content: turn1.text },
      { role: "user" as const, content: scenario.approvalMessage },
    ]

    const turn2 = await generateText({
      model,
      system: turn2System,
      messages: turn2Messages,
      tools,
      temperature: 0,
      stopWhen: stepCountIs(10),
    })

    const turn2Calls = extractCalls(turn2.steps)
    const turn2Tokens = sumTokens(turn2.steps)

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

/** Pre-check 변형이면 전용 runner, 아니면 v1 runner 사용 */
async function runWithRetryV2(
  model: LanguageModel,
  modelId: string,
  scenario: ToolCallingScenario,
  variant: PromptVariant
): Promise<BenchmarkResult> {
  const fn = PRECHECK_VARIANT_IDS.has(variant.id)
    ? runSingleWithPrecheck
    : (await import("../v1/runner")).runSingle

  try {
    return await fn(model, modelId, scenario, variant)
  } catch (err) {
    console.warn(`  ⚠ ${variant.id}/${scenario.label} 실패, 재시도...`)
    try {
      return await fn(model, modelId, scenario, variant)
    } catch (retryErr) {
      const errorMsg =
        retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error(`  ✗ ${variant.id}/${scenario.label} 재시도 실패: ${errorMsg}`)
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
// 메인 실행
// ---------------------------------------------------------------------------

export { type ModelConfig } from "../v1/runner"

export async function runBenchmark(modelConfig: ModelConfig) {
  const model = modelConfig.create()
  const modelLabel = `${modelConfig.provider}/${modelConfig.modelId}`

  console.log("=".repeat(70))
  console.log("  도구 호출 강제 패턴 벤치마크 v2")
  console.log(`  모델: ${modelLabel}`)
  console.log(
    `  시나리오: ${SCENARIOS.length}개 × 프롬프트: ${PROMPT_VARIANTS.length}개 = ${SCENARIOS.length * PROMPT_VARIANTS.length} runs`
  )
  console.log("=".repeat(70))
  console.log()

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
        promise: runWithRetryV2(model, modelConfig.modelId, scenario, variant),
      })
    }
  }

  const results = await Promise.all(runs.map((r) => r.promise))

  // 콘솔 요약 출력
  console.log("\n" + "=".repeat(70))
  console.log("  결과 요약")
  console.log("=".repeat(70) + "\n")

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

  const totalPass = results.filter((r) => r.pass).length
  console.log(
    `\n  전체 Pass Rate: ${totalPass}/${results.length} (${((totalPass / results.length) * 100).toFixed(1)}%)`
  )
  console.log()

  saveJson(results, modelConfig.modelId)
  saveTxt(results, modelConfig.modelId)

  return results
}
