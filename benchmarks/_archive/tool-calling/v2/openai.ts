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
