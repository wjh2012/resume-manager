// lib/ai/pipeline/index.ts
import type { LanguageModel } from "ai"
import type { AIProvider } from "@/types/ai"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"
import { compressMessages } from "./compress"

export { buildOnFinish } from "./on-finish"

const COMPRESS_THRESHOLD = 0.5

interface CompressIfNeededParams {
  model: LanguageModel
  modelId: string
  provider: AIProvider
  system: string
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
}

interface CompressIfNeededResult {
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function compressIfNeeded(
  params: CompressIfNeededParams,
): Promise<CompressIfNeededResult> {
  const totalTokens = countTokens(params.system, params.messages)
  const contextWindow = getModelContextWindow(params.provider, params.modelId)

  if (totalTokens > contextWindow * COMPRESS_THRESHOLD) {
    return compressMessages({ model: params.model, messages: params.messages })
  }

  return { messages: params.messages }
}
