/**
 * 채팅 파이프라인 벤치마크 — OpenAI
 *
 * 사용법:
 *   npx tsx scripts/benchmark-openai.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { createOpenAI } from "@ai-sdk/openai"
import { runBenchmark, type ModelConfig } from "./common"

// ---------------------------------------------------------------------------
// 모델 설정 — 여기서 모델 ID를 변경하세요
// ---------------------------------------------------------------------------
const MODELS = ["gpt-5.4-nano", "gpt-5.4"] as const

// ---------------------------------------------------------------------------

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OPENAI_API_KEY가 설정되지 않았습니다.")
  process.exit(1)
}

const openai = createOpenAI({ apiKey })

const models: ModelConfig[] = MODELS.map((modelId) => ({
  provider: "openai",
  modelId,
  create: () => openai(modelId),
}))

runBenchmark(models).catch(console.error)
