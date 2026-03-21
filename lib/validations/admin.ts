import { z } from "zod"

export const createModelPricingSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().min(1, "모델명을 입력해주세요."),
  inputPricePerM: z.coerce.number().min(0, "0 이상이어야 합니다."),
  outputPricePerM: z.coerce.number().min(0, "0 이상이어야 합니다."),
  effectiveFrom: z.coerce.date(),
})

export const createQuotaSchema = z.object({
  userId: z.string().uuid("유효하지 않은 사용자 ID입니다."),
  limitType: z.enum(["TOKENS", "COST", "REQUESTS"]),
  limitValue: z.coerce.number().positive("양수여야 합니다."),
  period: z.enum(["DAILY", "MONTHLY"]),
  isActive: z.boolean().optional().default(true),
})

export const updateQuotaSchema = z.object({
  limitValue: z.coerce.number().positive("양수여야 합니다.").optional(),
  isActive: z.boolean().optional(),
})

export const adminUsageQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})
