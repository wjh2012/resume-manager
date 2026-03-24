# 도구 호출 강제 패턴 벤치마크 v2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superpowers-style 강제 패턴(Hard Gate, Red Flags, Self-Check)을 적용한 S5 프롬프트를 벤치마크 v2에서 S4 대조군과 비교하여 under-call 개선 효과를 측정한다.

**Architecture:** v1의 판정 로직과 시나리오를 재사용하되, v2 전용 `prompts.ts`(S4+S5)와 `runner.ts`(v2 설정의 runBenchmark)를 새로 작성한다. v1은 유틸리티 함수에 `export` 키워드만 추가.

**Tech Stack:** TypeScript, AI SDK (`ai` package), OpenAI API

**Spec:** `docs/superpowers/specs/2026-03-24-tool-calling-enforcement-design.md`

---

## 파일 구조

| 파일 | 작업 | 역할 |
|------|------|------|
| `benchmarks/tool-calling/v1/runner.ts` | 수정 | 유틸리티 함수에 `export` 추가 |
| `benchmarks/tool-calling/v2/prompts.ts` | 생성 | S4(대조군) + S5(실험군) 프롬프트 변형 |
| `benchmarks/tool-calling/v2/runner.ts` | 생성 | v2 전용 `runBenchmark` (v1 유틸리티 import) |
| `benchmarks/tool-calling/v2/openai.ts` | 생성 | 엔트리포인트 |
| `benchmarks/tool-calling/v2/README.md` | 생성 | 실행 방법 및 목적 문서화 |

> **TDD 참고**: 벤치마크 스크립트는 프로덕션 코드가 아니며, 벤치마크 실행 자체가 검증 수단이다. 단위 테스트 대신 "컴파일 확인 → 벤치마크 실행"으로 검증한다.

---

### Task 1: v1 runner 유틸리티 export 추가

v2에서 재사용할 함수와 타입에 `export` 키워드를 추가한다. v1의 `runBenchmark` 동작에는 영향 없음.

**Files:**
- Modify: `benchmarks/tool-calling/v1/runner.ts`

- [ ] **Step 1: 유틸리티 함수에 export 추가**

`runner.ts`에서 다음 함수/타입 앞에 `export` 키워드 추가:

```typescript
// 이미 export된 것: BenchmarkResult, BenchmarkOutput, ModelConfig, runBenchmark
// 새로 export 추가:
export function judgePass(...)        // line 61
export function detectProposal(...)   // line 123
export function extractCalls(...)     // line 137
export function sumTokens(...)        // line 150
export async function runSingle(...)  // line 160
export async function runWithRetry(...)  // line 267
```

`function` 앞에 `export`만 추가. 함수 내부는 변경하지 않음.

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (프로젝트 전체 컴파일 확인. 파일 단독 지정 시 tsconfig.json이 무시되어 false failure 발생)

- [ ] **Step 3: 커밋**

커밋 플로우 (`/git-commit`) 준수. 메시지 예시:
```
refactor(benchmark): v1 runner 유틸리티 함수 export 추가
```

---

### Task 2: v2 프롬프트 변형 작성 (S4 + S5)

S4(대조군)와 S5(실험군)를 정의한다. v1의 `buildContext`, `createTools`를 재사용.

**Files:**
- Create: `benchmarks/tool-calling/v2/prompts.ts`

- [ ] **Step 1: v2/prompts.ts 작성**

```typescript
/**
 * 도구 호출 강제 패턴 벤치마크 v2 — 프롬프트 변형
 *
 * S4(대조군): v1의 S4 텍스트 복사 (실험 격리)
 * S5(실험군): Superpowers-style 강제 패턴 적용
 */

import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
} from "../v1/scenarios"

// v1의 공유 유틸리티 재사용
export { buildContext, createTools, type PromptVariant } from "../v1/prompts"

const JOB_POSTING_TEXT = MOCK_DOCUMENTS.find(
  (d) => d.id === "doc-3"
)!.extractedText

// ---------------------------------------------------------------------------
// S4: 대조군 (v1 S4 텍스트 복사 — 실험 격리를 위한 의도적 중복)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// S5: 실험군 — Superpowers-style 강제 패턴
// ---------------------------------------------------------------------------

const S5: PromptVariant = {
  id: "S5",
  label: "강제 패턴",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요.

[필수 전제 조건]
- 초안/문단 작성은 반드시 readDocument로 원문을 확인한 후 시작하세요.
- 새 경험/수치가 언급되면 반드시 커리어노트 저장을 제안하세요.
- 기존 기록의 수치 변경 시, readCareerNote로 현재 내용을 확인한 후 saveCareerNote를 제안하세요.

[도구 호출 의사결정 — 위에서부터 순서대로 평가하세요]
1. 사용자가 참고자료에 이미 기록된 수치/사실의 변경을 언급했는가?
   → readCareerNote로 기존 기록을 확인하세요. 그 후 수정된 내용으로 saveCareerNote를 제안하세요.
2. 사용자가 참고자료에 없는 새 경험/성과/수치를 언급했는가?
   → saveCareerNote 저장을 제안하세요.
3. 초안/문단 작성이 필요한가?
   → readDocument로 관련 참고자료 원문을 읽은 후 작성하세요.
4. 위 어느 것에도 해당하지 않는가?
   → 도구 호출 없이 응답하세요.

[도구 호출 Red Flags — 이런 생각이 들면 멈추고 재확인하세요]
| 생각 | 실제 |
|------|------|
| "요약만으로 초안을 쓸 수 있다" | 요약은 개요일 뿐. 초안에는 원문의 구체적 수치와 맥락이 필요합니다. readDocument로 확인하세요. |
| "새 정보를 자기소개서에 반영하면 충분하다" | 자기소개서 반영과 커리어노트 저장은 별개입니다. 새 경험은 커리어노트 저장도 제안하세요. |
| "사용자에게 추가 질문을 먼저 하자" | 경험이 이미 구체적이면(수치, 기간, 결과 포함) 저장 제안이 우선입니다. |
| "기존 노트 ID를 알고 있으니 바로 수정하면 된다" | readCareerNote로 현재 내용을 확인해야 기존 정보 유실을 방지할 수 있습니다. |

[응답 전 체크리스트]
□ 초안을 작성했다면 — readDocument를 호출했는가?
□ 새 경험이 언급되었다면 — 커리어노트 저장을 제안했는가?
□ 수치가 변경되었다면 — readCareerNote를 먼저 호출했는가?
□ 위 어느 것에도 해당하지 않는다면 — 도구 호출 없이 응답해도 되는가?
하나라도 미충족이면 도구를 호출한 후 응답을 시작하세요.

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

export const PROMPT_VARIANTS = [S4, S5]
```

- [ ] **Step 2: 커밋**

```
feat(benchmark): v2 프롬프트 변형 S4(대조군) + S5(강제 패턴)
```

---

### Task 3: v2 runner 작성

v1 유틸리티를 import하고, v2 전용 `PROMPT_VARIANTS`와 `RESULTS_DIR`로 `runBenchmark`를 구성한다.

**Files:**
- Create: `benchmarks/tool-calling/v2/runner.ts`

- [ ] **Step 1: v2/runner.ts 작성**

```typescript
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
import {
  runWithRetry,
  type BenchmarkResult,
  type BenchmarkOutput,
  type ModelConfig,
} from "../v1/runner"
import {
  PROMPT_VARIANTS,
  type PromptVariant,
} from "./prompts"

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

  // S4 vs S5 직접 비교
  report += "[S4 vs S5 직접 비교]\n"
  for (const scenario of SCENARIOS) {
    const s4 = results.find(
      (r) => r.scenario === scenario.label && r.promptVariant === "S4"
    )
    const s5 = results.find(
      (r) => r.scenario === scenario.label && r.promptVariant === "S5"
    )
    const s4Status = s4?.pass ? "✅" : s4?.error ? "⚠" : "❌"
    const s5Status = s5?.pass ? "✅" : s5?.error ? "⚠" : "❌"
    const change = s4?.pass === s5?.pass ? "→" : !s4?.pass && s5?.pass ? "↑" : "↓"
    report += `  ${scenario.label}: S4 ${s4Status} ${change} S5 ${s5Status}\n`
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
        promise: runWithRetry(model, modelConfig.modelId, scenario, variant),
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
```

- [ ] **Step 2: 커밋**

```
feat(benchmark): v2 runner — v1 유틸리티 재사용 + S4/S5 비교 출력
```

---

### Task 4: v2 엔트리포인트 + README 작성

**Files:**
- Create: `benchmarks/tool-calling/v2/openai.ts`
- Create: `benchmarks/tool-calling/v2/README.md`

- [ ] **Step 1: v2/openai.ts 작성**

```typescript
/**
 * 도구 호출 강제 패턴 벤치마크 v2 — OpenAI
 *
 * 사용법:
 *   npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4
 *   npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4-nano
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { createOpenAI } from "@ai-sdk/openai"
import { runBenchmark, type ModelConfig } from "./runner"

const modelArg = process.argv.find((_, i, arr) => arr[i - 1] === "--model")
if (!modelArg) {
  console.error("사용법: npx tsx benchmarks/tool-calling/v2/openai.ts --model <model-id>")
  console.error("예시: --model gpt-5.4")
  process.exit(1)
}

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

- [ ] **Step 2: v2/README.md 작성**

```markdown
# 도구 호출 강제 패턴 벤치마크 (v2)

Superpowers-style 강제 패턴(Hard Gate, Red Flags, Self-Check)이
tool-calling under-call을 개선하는지 검증한다.

## 비교 대상

| 변형 | 설명 | 역할 |
|------|------|------|
| S4 | v1의 단계별 판단 (의사결정 트리) | 대조군 |
| S5 | S4 + Hard Gate + Red Flags + Self-Check | 실험군 |

## 실행

```bash
npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4
npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4-nano
```

API 키: `.env.local`의 `OPENAI_API_KEY`

## 시나리오

v1과 동일 (4개). `../v1/scenarios.ts`에서 import.

## 성공 기준

| 지표 | 현재 (S4) | 목표 (S5) |
|------|-----------|-----------|
| gpt-5.4 전체 | 75% (3/4) | 100% (4/4) |
| gpt-5.4-nano 전체 | 50% (2/4) | 75% (3/4) |
| 시나리오 2 (수치 변경) | 0% | ≥50% |

## 설계 문서

`docs/superpowers/specs/2026-03-24-tool-calling-enforcement-design.md`
```

- [ ] **Step 3: v2/results/.gitkeep 생성**

```bash
mkdir -p benchmarks/tool-calling/v2/results
touch benchmarks/tool-calling/v2/results/.gitkeep
```

v1과 동일하게 results 디렉토리를 git에서 추적하되, 결과 파일 자체는 `.gitignore`로 제외.

- [ ] **Step 4: 커밋**

```
feat(benchmark): v2 엔트리포인트 및 README
```

---

### Task 5: 컴파일 검증 + 벤치마크 실행

**Files:** 없음 (검증만)

- [ ] **Step 1: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: gpt-5.4 벤치마크 실행**

Run: `npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4`
Expected: 8 runs 완료 (S4 4건 + S5 4건), JSON/TXT 결과 `v2/results/`에 저장

- [ ] **Step 3: gpt-5.4-nano 벤치마크 실행**

Run: `npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4-nano`
Expected: 8 runs 완료, 결과 저장

- [ ] **Step 4: 결과 분석**

TXT 결과 파일에서 확인:
- S4 vs S5 직접 비교 섹션에서 ↑ (개선) 표시 확인
- 시나리오 2(수치 변경)에서 S5가 S4보다 개선되었는지 확인
- S5가 기존 S4 통과 시나리오(1, 3, 4)에서 회귀하지 않았는지 확인

- [ ] **Step 5: 결과 커밋**

```
test(benchmark): v2 벤치마크 실행 결과 — S4 vs S5 비교
```
