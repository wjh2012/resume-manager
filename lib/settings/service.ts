import { prisma } from "@/lib/prisma"
import { maskApiKey } from "@/lib/validations/ai-settings"
import type { AIProvider } from "@/types/ai"

interface AiSettingsResult {
  provider: AIProvider
  model: string
  hasApiKey: boolean
}

interface AiSettingsApiResult extends AiSettingsResult {
  maskedApiKey: string | null
}

const DEFAULT_SETTINGS: AiSettingsResult = {
  provider: "openai",
  model: "gpt-4o",
  hasApiKey: false,
}

// RSC용: API 키 원문 제외
export async function getAiSettings(userId: string): Promise<AiSettingsResult> {
  const settings = await prisma.aiSettings.findUnique({
    where: { userId },
    select: { provider: true, model: true, apiKey: true },
  })

  if (!settings) return DEFAULT_SETTINGS

  return {
    provider: settings.provider as AIProvider,
    model: settings.model,
    hasApiKey: !!settings.apiKey,
  }
}

// API 응답용: 마스킹된 API 키 포함 (단일 쿼리)
export async function getAiSettingsForApi(userId: string): Promise<AiSettingsApiResult> {
  const settings = await prisma.aiSettings.findUnique({
    where: { userId },
    select: { provider: true, model: true, apiKey: true },
  })

  if (!settings) {
    return { ...DEFAULT_SETTINGS, maskedApiKey: null }
  }

  return {
    provider: settings.provider as AIProvider,
    model: settings.model,
    hasApiKey: !!settings.apiKey,
    maskedApiKey: settings.apiKey ? maskApiKey(settings.apiKey) : null,
  }
}

export async function updateAiSettings(
  userId: string,
  data: { provider: string; model: string; apiKey?: string },
): Promise<AiSettingsApiResult> {
  const updateData: { provider: string; model: string; apiKey?: string } = {
    provider: data.provider,
    model: data.model,
  }

  // apiKey가 빈 문자열이거나 생략되면 기존 키 유지
  if (data.apiKey && data.apiKey.length > 0) {
    updateData.apiKey = data.apiKey
  }

  const result = await prisma.aiSettings.upsert({
    where: { userId },
    create: { userId, ...updateData },
    update: updateData,
    select: { provider: true, model: true, apiKey: true },
  })

  return {
    provider: result.provider as AIProvider,
    model: result.model,
    hasApiKey: !!result.apiKey,
    maskedApiKey: result.apiKey ? maskApiKey(result.apiKey) : null,
  }
}
