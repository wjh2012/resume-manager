import { type LanguageModel } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { prisma } from "@/lib/prisma"
import { AI_PROVIDERS, type AIProvider } from "@/types/ai"

export class AiSettingsNotFoundError extends Error {
  constructor() {
    super("AI 설정이 완료되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.")
  }
}

// 순수 함수: SDK별 LanguageModel 생성
export function createLanguageModel(
  provider: AIProvider,
  model: string,
  apiKey: string,
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model)
    case "anthropic":
      return createAnthropic({ apiKey })(model)
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model)
    default: {
      const _exhaustive: never = provider
      throw new Error(`지원하지 않는 AI 제공자: ${_exhaustive}`)
    }
  }
}

// DB에서 사용자 AI 설정 조회 후 LanguageModel 반환
export async function getLanguageModel(userId: string): Promise<LanguageModel> {
  const settings = await prisma.aiSettings.findUnique({
    where: { userId },
    select: { provider: true, model: true, apiKey: true },
  })

  if (!settings?.apiKey) {
    throw new AiSettingsNotFoundError()
  }

  if (!AI_PROVIDERS.includes(settings.provider as AIProvider)) {
    throw new Error(`지원하지 않는 AI 제공자: ${settings.provider}`)
  }

  return createLanguageModel(
    settings.provider as AIProvider,
    settings.model,
    settings.apiKey,
  )
}
