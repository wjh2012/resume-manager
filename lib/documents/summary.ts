import { generateText } from "ai"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

interface SummaryResult {
  summary: string | null
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export async function generateDocumentSummary(
  userId: string,
  extractedText: string,
): Promise<SummaryResult> {
  try {
    const quotaResult = await checkQuotaExceeded(userId)
    if (quotaResult.exceeded) {
      console.warn("쿼터 초과 — 요약 건너뜀")
      return { summary: null }
    }

    const { model, isServerKey, provider, modelId } = await getLanguageModel(userId)

    const { text, usage } = await generateText({
      model,
      system: "당신은 문서 요약 전문가입니다. 주어진 문서의 핵심 내용을 1~4줄로 요약하세요. 직무 경험, 기술 스택, 핵심 성과 위주로 요약합니다.",
      prompt: extractedText,
    })

    const usageData = {
      promptTokens: usage?.inputTokens ?? 0,
      completionTokens: usage?.outputTokens ?? 0,
      totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    }

    await recordUsage({
      userId,
      provider,
      model: modelId,
      feature: "DOCUMENT_SUMMARY",
      ...usageData,
      isServerKey,
      metadata: {},
    }).catch((e) => console.error("요약 토큰 사용량 기록 실패:", e))

    return { summary: text, usage: usageData }
  } catch (error) {
    if (error instanceof AiSettingsNotFoundError) {
      console.warn("AI 설정 없음 — 요약 건너뜀")
      return { summary: null }
    }
    console.error("문서 요약 생성 실패:", error)
    return { summary: null }
  }
}
