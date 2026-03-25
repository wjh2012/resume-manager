import { PROVIDER_MODELS, type AIProvider } from "@/types/ai"

/** 한국어 1.5~2자/토큰, 영어 ~4자/토큰. 보수적으로 2 사용 (한국어 위주 서비스) */
const CHARS_PER_TOKEN = 2

function contentLength(content: unknown): number {
  if (typeof content === "string") return content.length
  if (Array.isArray(content)) {
    return content.reduce((sum: number, part: unknown) => {
      if (typeof part === "object" && part !== null && "text" in part) {
        return sum + String((part as { text: string }).text).length
      }
      return sum
    }, 0)
  }
  return JSON.stringify(content).length
}

export function countTokens(
  system: string,
  messages: Array<{ content: unknown }>,
): number {
  const chars = system.length + messages.reduce((sum, m) => sum + contentLength(m.content), 0)
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

export function getModelContextWindow(provider: AIProvider, modelId: string): number {
  const models = PROVIDER_MODELS[provider]
  const found = models.find((m) => m.value === modelId)
  if (!found) {
    throw new Error(`Unknown model: ${provider}/${modelId}`)
  }
  return found.contextWindow
}
