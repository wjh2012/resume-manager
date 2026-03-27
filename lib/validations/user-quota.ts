import { z } from "zod"

export const createUserQuotaSchema = z.object({
  limitType: z.enum(["TOKENS", "COST"], {
    errorMap: () => ({ message: "토큰 또는 비용만 선택할 수 있습니다." }),
  }),
  limitValue: z.coerce.number().positive("양수여야 합니다."),
  isActive: z.boolean().optional().default(true),
})

export const updateUserQuotaSchema = z
  .object({
    limitValue: z.coerce.number().positive("양수여야 합니다.").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.limitValue !== undefined || data.isActive !== undefined,
    { message: "변경할 필드를 입력해주세요." },
  )
