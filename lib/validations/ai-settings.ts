import { z } from "zod"
import { AI_PROVIDERS, PROVIDER_MODELS } from "@/types/ai"

function isValidModelForProvider(data: { provider: string; model: string }) {
  const models = PROVIDER_MODELS[data.provider as (typeof AI_PROVIDERS)[number]]
  return models?.some((m) => m.value === data.model)
}

const providerModelRefine = {
  message: "선택한 제공자에서 지원하지 않는 모델입니다.",
} as const

// 저장용: provider + model + apiKey 필수
export const aiSettingsSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().min(1),
    apiKey: z.string().min(1, "API 키를 입력해주세요."),
  })
  .refine(isValidModelForProvider, providerModelRefine)

// 수정용: apiKey는 선택 (빈 문자열이거나 생략 시 기존 키 유지)
export const aiSettingsUpdateSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().min(1),
    apiKey: z.string().optional(),
  })
  .refine(isValidModelForProvider, providerModelRefine)

// 검증용: provider + apiKey만 필요
export const apiKeyValidateSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().min(1, "API 키를 입력해주세요."),
})

// API 키 마스킹: 앞 4자리 + *** + 뒤 4자리 (8자 미만이면 ****)
export function maskApiKey(key: string): string {
  if (key.length < 8) return "****"
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}
