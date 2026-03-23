import { generateText, type LanguageModel } from "ai"

/** 압축 시 유지할 최근 메시지 수 (user/assistant 각 1건 = 1 메시지) */
const RECENT_MESSAGES = 4

interface CompressParams {
  model: LanguageModel
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
}

interface CompressResult {
  messages: Array<{ role: "user" | "assistant"; content: unknown }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function compressMessages(params: CompressParams): Promise<CompressResult> {
  const { model, messages } = params

  if (messages.length <= RECENT_MESSAGES) {
    return { messages }
  }

  const oldMessages = messages.slice(0, -RECENT_MESSAGES)
  const recentMessages = messages.slice(-RECENT_MESSAGES)

  try {
    const oldText = oldMessages
      .map((m) => {
        const text = Array.isArray(m.content)
          ? m.content
              .filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }) => p.text)
              .join("")
          : String(m.content)
        return `${m.role}: ${text}`
      })
      .join("\n")

    const { text: summary, usage } = await generateText({
      model,
      system: "이전 대화 내용을 3~5문장으로 요약하세요. 핵심 요청, 결정사항, 맥락을 유지하세요.",
      prompt: oldText,
    })

    const summaryMessage = {
      role: "user" as const,
      content: [{ type: "text" as const, text: `[이전 대화 요약]\n${summary}` }],
    }

    return {
      messages: [summaryMessage, ...recentMessages],
      usage: usage
        ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }
        : undefined,
    }
  } catch (error) {
    console.error("[compressMessages] 압축 실패, 원본 사용:", error)
    return { messages }
  }
}
