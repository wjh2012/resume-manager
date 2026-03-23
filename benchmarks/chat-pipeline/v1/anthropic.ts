/**
 * 채팅 파이프라인 벤치마크 — Anthropic
 *
 * 사용법:
 *   npx tsx scripts/benchmark-anthropic.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { createAnthropic } from "@ai-sdk/anthropic"
import { runBenchmark, type ModelConfig } from "./common"

// ---------------------------------------------------------------------------
// 모델 설정 — 여기서 모델 ID를 변경하세요
// ---------------------------------------------------------------------------
const MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"] as const

// ---------------------------------------------------------------------------

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
  process.exit(1)
}

const anthropic = createAnthropic({ apiKey })

const models: ModelConfig[] = MODELS.map((modelId) => ({
  provider: "anthropic",
  modelId,
  create: () => anthropic(modelId),
}))

runBenchmark(models).catch(console.error)
