/**
 * 채팅 파이프라인 벤치마크 — Google
 *
 * 사용법:
 *   npx tsx scripts/benchmark-google.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { runBenchmark, type ModelConfig } from "./common"

// ---------------------------------------------------------------------------
// 모델 설정 — 여기서 모델 ID를 변경하세요
// ---------------------------------------------------------------------------
const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-3.1-pro-preview"] as const

// ---------------------------------------------------------------------------

const apiKey = process.env.GOOGLE_API_KEY
if (!apiKey) {
  console.error("GOOGLE_API_KEY가 설정되지 않았습니다.")
  process.exit(1)
}

const google = createGoogleGenerativeAI({ apiKey })

const models: ModelConfig[] = MODELS.map((modelId) => ({
  provider: "google",
  modelId,
  create: () => google(modelId),
}))

runBenchmark(models).catch(console.error)
