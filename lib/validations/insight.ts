import { z } from "zod"
import { INSIGHT_CATEGORIES } from "@/lib/ai/prompts/insight-extraction"

export const extractInsightsSchema = z.object({
  conversationId: z.string().uuid("올바른 대화 ID 형식이 아닙니다."),
})

export const updateInsightSchema = z.object({
  title: z.string({ error: "제목을 입력해주세요." }).min(1).max(200),
  content: z.string({ error: "내용을 입력해주세요." }).min(1),
  category: z.enum(INSIGHT_CATEGORIES, {
    error: "올바른 카테고리를 선택해주세요.",
  }),
})
