/**
 * 채팅 파이프라인 벤치마크 — 공통 모듈
 * 목업 데이터, 시나리오, 벤치마크 함수, 결과 출력/저장
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { generateText, Output, tool, stepCountIs } from "ai"
import { z } from "zod"
import type { LanguageModel } from "ai"

// ---------------------------------------------------------------------------
// 1. 목업 데이터 — benchmarks/fixtures/mock-data.ts에서 재수출
// ---------------------------------------------------------------------------

export { MOCK_DOCUMENTS, MOCK_CAREER_NOTES } from "../../fixtures/mock-data"
import { MOCK_DOCUMENTS, MOCK_CAREER_NOTES } from "../../fixtures/mock-data"


// ---------------------------------------------------------------------------
// 2. 대화 시나리오 — benchmarks/fixtures/mock-data.ts에서 import
// ---------------------------------------------------------------------------

import { CONV_STYLES } from "../../fixtures/mock-data"

// ---------------------------------------------------------------------------
// 3. 시나리오
// ---------------------------------------------------------------------------

export interface Scenario {
  label: string
  docCount: number
  noteCount: number
  convStyle: string
}

export const SCENARIOS: Scenario[] = [
  { label: "소규모/정중한유저 (문서3/노트2)", docCount: 3, noteCount: 2, convStyle: "polite" },
  { label: "중규모/짧은유저 (문서5/노트3)", docCount: 5, noteCount: 3, convStyle: "terse" },
  { label: "대규모/맥락끊는유저 (문서7/노트5)", docCount: 7, noteCount: 5, convStyle: "jumpy" },
]

function buildContext(docs: typeof MOCK_DOCUMENTS, notes: typeof MOCK_CAREER_NOTES) {
  return docs.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")
    + "\n\n---\n\n"
    + notes.map(
      (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
    ).join("\n\n---\n\n")
}

// ---------------------------------------------------------------------------
// 4. 벤치마크 결과 타입
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  approach: string
  provider: string
  model: string
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  steps: number
  durationMs: number
  toolCalls: string[]
  responseFull: string
  responsePreview: string
}

export interface ModelConfig {
  provider: string
  modelId: string
  create: () => LanguageModel
}

// ---------------------------------------------------------------------------
// 5. 벤치마크 함수
// ---------------------------------------------------------------------------

export async function benchmarkMultiStep(model: LanguageModel, label: string, scenario: Scenario): Promise<BenchmarkResult> {
  const docs = MOCK_DOCUMENTS.slice(0, scenario.docCount)
  const notes = MOCK_CAREER_NOTES.slice(0, scenario.noteCount)
  const conv = CONV_STYLES[scenario.convStyle]
  const context = buildContext(docs, notes)

  const start = Date.now()

  const readDocument = tool({
    description: "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      documentId: z.string().describe("읽을 문서의 ID"),
    }),
    execute: async ({ documentId }) => {
      const doc = docs.find((d) => d.id === documentId)
      if (!doc) return "문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.extractedText}`
    },
  })

  const readCareerNote = tool({
    description: "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().describe("읽을 커리어노트의 ID"),
    }),
    execute: async ({ careerNoteId }) => {
      const note = notes.find((n) => n.id === careerNoteId)
      if (!note) return "커리어노트를 찾을 수 없습니다."
      return `[${note.title}]\n${note.content}`
    },
  })

  const systemPrompt = `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요.

[참고자료]
${context}`

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: conv.map((m) => ({ role: m.role, content: m.content })),
    tools: { readDocument, readCareerNote },
    stopWhen: stepCountIs(Math.min(docs.length + notes.length + 2, 15)),
  })

  const duration = Date.now() - start

  const allToolCalls = result.steps.flatMap((s) =>
    (s.toolCalls ?? []).map((tc) => {
      const args = tc.input ?? (tc as any).args ?? {}
      return `${tc.toolName}(${JSON.stringify(args)})`
    })
  )

  let totalInput = 0
  let totalOutput = 0
  for (const step of result.steps) {
    totalInput += step.usage?.inputTokens ?? 0
    totalOutput += step.usage?.outputTokens ?? 0
  }

  return {
    approach: "멀티스텝 Tool Loop",
    provider: label.split("/")[0],
    model: label.split("/")[1],
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
    steps: result.steps.length,
    durationMs: duration,
    toolCalls: allToolCalls,
    responseFull: result.text,
    responsePreview: result.text.slice(0, 200) + (result.text.length > 200 ? "..." : ""),
  }
}

const classificationSchema = z.object({
  documentsToRead: z.array(z.string()).describe("전문을 읽어야 할 문서 ID 목록"),
  compareCareerNotes: z.boolean().describe("커리어노트 상세 비교 필요 여부"),
  needsCompression: z.boolean().describe("대화 압축 필요 여부"),
})

export async function benchmarkClassification(model: LanguageModel, label: string, scenario: Scenario): Promise<BenchmarkResult> {
  const docs = MOCK_DOCUMENTS.slice(0, scenario.docCount)
  const notes = MOCK_CAREER_NOTES.slice(0, scenario.noteCount)
  const conv = CONV_STYLES[scenario.convStyle]
  const context = buildContext(docs, notes)

  const start = Date.now()
  let totalInput = 0
  let totalOutput = 0

  const classificationPrompt = `사용자 메시지와 참고자료 요약을 보고 판단하세요:
1. documentsToRead: 전문을 읽어야 할 문서의 ID를 선택하세요. 요약만으로 충분하면 빈 배열.
2. compareCareerNotes: 기존 커리어노트와 비교가 필요하면 true.
3. needsCompression: 대화가 길어서 압축이 필요하면 true. (현재 ${conv.length}개 메시지)

[참고자료 요약]
${context}

[현재 대화]
${conv.map((m) => `${m.role}: ${m.content}`).join("\n")}`

  const classifyResult = await generateText({
    model,
    output: Output.object({ schema: classificationSchema }),
    prompt: classificationPrompt,
  })

  totalInput += classifyResult.usage?.inputTokens ?? 0
  totalOutput += classifyResult.usage?.outputTokens ?? 0

  const classification = classifyResult.output!

  const fetchedDocs = docs.filter((d) =>
    classification.documentsToRead.includes(d.id)
  )
  const fetchedNotes = classification.compareCareerNotes ? notes : []

  const docsContext = fetchedDocs.length > 0
    ? fetchedDocs.map((d) => `[${d.title}]\n${d.extractedText}`).join("\n\n---\n\n")
    : ""
  const notesContext = fetchedNotes.length > 0
    ? fetchedNotes.map((n) => `[${n.title}]\n${n.content}`).join("\n\n---\n\n")
    : ""

  const systemPrompt = `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.

[참고자료 — 문서 전문]
${docsContext || "(없음)"}

[참고자료 — 커리어노트]
${notesContext || "(없음)"}

[참고자료 — 요약]
${context}`

  const responseResult = await generateText({
    model,
    system: systemPrompt,
    messages: conv.map((m) => ({ role: m.role, content: m.content })),
  })

  totalInput += responseResult.usage?.inputTokens ?? 0
  totalOutput += responseResult.usage?.outputTokens ?? 0

  const duration = Date.now() - start

  return {
    approach: "1단계 분류 + 서버 실행",
    provider: label.split("/")[0],
    model: label.split("/")[1],
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
    steps: 2,
    durationMs: duration,
    toolCalls: [
      `classification → ${JSON.stringify(classification)}`,
      ...fetchedDocs.map((d) => `server_fetch(${d.id})`),
      ...(fetchedNotes.length > 0 ? ["server_fetch(career_notes)"] : []),
    ],
    responseFull: responseResult.text,
    responsePreview: responseResult.text.slice(0, 200) + (responseResult.text.length > 200 ? "..." : ""),
  }
}

// ---------------------------------------------------------------------------
// 6. 출력 / 저장
// ---------------------------------------------------------------------------

export function printResult(r: BenchmarkResult) {
  console.log(`  방식: ${r.approach}`)
  console.log(`  모델: ${r.provider}/${r.model}`)
  console.log(`  토큰: 입력 ${r.totalInputTokens} + 출력 ${r.totalOutputTokens} = 총 ${r.totalTokens}`)
  console.log(`  스텝: ${r.steps}`)
  console.log(`  시간: ${r.durationMs}ms`)
  console.log(`  도구: ${r.toolCalls.join(", ")}`)
  console.log(`  응답: ${r.responsePreview}`)
  console.log()
}

export function printComparison(a: BenchmarkResult, b: BenchmarkResult) {
  const tokenDiff = a.totalTokens - b.totalTokens
  const tokenPct = ((tokenDiff / a.totalTokens) * 100).toFixed(1)
  const timeDiff = a.durationMs - b.durationMs
  const timePct = ((timeDiff / a.durationMs) * 100).toFixed(1)

  console.log("  ┌─────────────────────┬──────────────────┬──────────────────────────┐")
  console.log("  │                     │ 멀티스텝         │ 1단계 분류               │")
  console.log("  ├─────────────────────┼──────────────────┼──────────────────────────┤")
  console.log(`  │ 입력 토큰           │ ${String(a.totalInputTokens).padStart(16)} │ ${String(b.totalInputTokens).padStart(24)} │`)
  console.log(`  │ 출력 토큰           │ ${String(a.totalOutputTokens).padStart(16)} │ ${String(b.totalOutputTokens).padStart(24)} │`)
  console.log(`  │ 총 토큰             │ ${String(a.totalTokens).padStart(16)} │ ${String(b.totalTokens).padStart(24)} │`)
  console.log(`  │ 스텝 수             │ ${String(a.steps).padStart(16)} │ ${String(b.steps).padStart(24)} │`)
  console.log(`  │ 소요 시간           │ ${(a.durationMs + "ms").padStart(16)} │ ${(b.durationMs + "ms").padStart(24)} │`)
  console.log("  ├─────────────────────┼──────────────────┴──────────────────────────┤")
  console.log(`  │ 토큰 차이           │ ${tokenDiff > 0 ? `분류 방식이 ${Math.abs(tokenDiff)}토큰 절약 (${Math.abs(Number(tokenPct))}%)` : `멀티스텝이 ${Math.abs(tokenDiff)}토큰 절약 (${Math.abs(Number(tokenPct))}%)`}`)
  console.log(`  │ 시간 차이           │ ${timeDiff > 0 ? `분류 방식이 ${Math.abs(timeDiff)}ms 빠름 (${Math.abs(Number(timePct))}%)` : `멀티스텝이 ${Math.abs(timeDiff)}ms 빠름 (${Math.abs(Number(timePct))}%)`}`)
  console.log("  └─────────────────────┴─────────────────────────────────────────────┘")
  console.log()
}

interface ResultPair { scenario: Scenario; a: BenchmarkResult; b: BenchmarkResult }

export function saveResults(allPairs: ResultPair[], modelIds: string[]) {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")
  const modelSuffix = modelIds.map((id) => id.replace(/[/.]/g, "-")).join("_")
  const outPath = path.join("benchmarks/chat-pipeline/v1/results", `benchmark-result-${timestamp}_${modelSuffix}.txt`)

  let report = ""
  report += "=".repeat(70) + "\n"
  report += "  채팅 파이프라인 벤치마크 결과\n"
  report += `  실행 시간: ${new Date().toISOString()}\n`
  report += `  모델: ${modelIds.join(", ")}\n`
  report += "=".repeat(70) + "\n\n"

  for (const { scenario, a, b } of allPairs) {
    report += "=".repeat(70) + "\n"
    report += `▶ ${a.provider}/${a.model} — ${scenario.label}\n`
    report += "=".repeat(70) + "\n\n"

    report += "[정량 비교]\n"
    report += `  멀티스텝:  입력 ${a.totalInputTokens} + 출력 ${a.totalOutputTokens} = 총 ${a.totalTokens} 토큰 | ${a.steps}스텝 | ${a.durationMs}ms\n`
    report += `  분류방식:  입력 ${b.totalInputTokens} + 출력 ${b.totalOutputTokens} = 총 ${b.totalTokens} 토큰 | ${b.steps}스텝 | ${b.durationMs}ms\n\n`

    report += "[도구 호출]\n"
    report += `  멀티스텝:  ${a.toolCalls.join(", ") || "(없음)"}\n`
    report += `  분류방식:  ${b.toolCalls.join(", ")}\n\n`

    report += "[응답 전문 — 멀티스텝]\n" + a.responseFull + "\n\n"
    report += "[응답 전문 — 분류방식]\n" + b.responseFull + "\n\n"
  }

  report += "=".repeat(70) + "\n"
  report += "  평가 기준\n"
  report += "=".repeat(70) + "\n\n"
  report += `사용자 질문: "deploy-ez 프로젝트를 네이버 클라우드에 어필할 수 있는 부분 뽑아줘"\n\n`
  report += "정답에 가까운 행동:\n"
  report += "  ✅ doc-2 (포트폴리오) 전문 읽기 — deploy-ez 상세 내용\n"
  report += "  ✅ doc-3 (채용공고) 전문 읽기 — 요구사항 확인\n"
  report += "  ❓ doc-1 (이력서) — 읽어도 되고 안 읽어도 됨\n"
  report += "  ❓ 커리어노트 — 관련성 낮지만 참고 가능\n\n"
  report += "좋은 응답의 조건:\n"
  report += "  - deploy-ez의 구체적 내용 언급 (Go, K8s, Stars 450+)\n"
  report += "  - 채용공고 요구사항과 매칭 (K8s 경험, 오픈소스 기여)\n"
  report += "  - 자기소개서에 쓸 수 있는 문장 형태\n"

  fs.writeFileSync(outPath, report, "utf-8")
  console.log(`\n📄 결과 저장: ${outPath}`)
}

// ---------------------------------------------------------------------------
// 7. 실행 엔트리
// ---------------------------------------------------------------------------

export async function runBenchmark(models: ModelConfig[]) {
  if (models.length === 0) {
    console.error("API 키가 설정되지 않았습니다.")
    process.exit(1)
  }

  const modelIds = models.map((m) => m.modelId)

  console.log("=".repeat(70))
  console.log("  채팅 파이프라인 벤치마크")
  console.log("  멀티스텝 Tool Loop vs 1단계 분류 + 서버 실행")
  console.log("=".repeat(70))
  console.log()
  console.log(`테스트 모델: ${models.map((m) => `${m.provider}/${m.modelId}`).join(", ")}`)
  console.log(`시나리오: ${SCENARIOS.map((s) => s.label).join(" / ")}`)
  console.log()

  interface ResultPair { scenario: Scenario; a: BenchmarkResult; b: BenchmarkResult }
  const allPairs: ResultPair[] = []

  for (const modelConfig of models) {
    const label = `${modelConfig.provider}/${modelConfig.modelId}`

    for (const scenario of SCENARIOS) {
      console.log("=".repeat(70))
      console.log(`▶ ${label} — ${scenario.label}`)
      console.log("=".repeat(70))

      try {
        const model = modelConfig.create()

        console.log("\n[A] 멀티스텝 Tool Loop 실행 중...")
        const resultA = await benchmarkMultiStep(model, label, scenario)
        printResult(resultA)

        console.log("[B] 1단계 분류 + 서버 실행 중...")
        const resultB = await benchmarkClassification(model, label, scenario)
        printResult(resultB)

        console.log("[비교]")
        printComparison(resultA, resultB)

        allPairs.push({ scenario, a: resultA, b: resultB })
      } catch (error) {
        console.error(`  ❌ ${label} / ${scenario.label} 실패:`, error instanceof Error ? error.message : error)
        console.log()
      }
    }
  }

  saveResults(allPairs, modelIds)

  console.log("=".repeat(70))
  console.log("  벤치마크 완료")
  console.log("=".repeat(70))
}
