import { z } from "zod"

export const tokenUsageQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  feature: z.enum(["COVER_LETTER", "INTERVIEW", "INSIGHT", "EMBEDDING"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tz: z.string().regex(/^[A-Za-z_/]+$/).optional().default("UTC"),
})

export const usageSummaryQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tz: z.string().regex(/^[A-Za-z_/]+$/).optional().default("UTC"),
})
