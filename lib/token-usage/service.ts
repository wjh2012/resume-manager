import { Prisma, type UsageFeature } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { calculateCost } from "./pricing"

interface RecordUsageParams {
  userId: string
  provider: string
  model: string
  feature: UsageFeature
  promptTokens: number
  completionTokens: number
  totalTokens: number
  isServerKey: boolean
  metadata?: Prisma.InputJsonValue
}

export async function recordUsage(params: RecordUsageParams) {
  const estimatedCost = await calculateCost({
    provider: params.provider,
    model: params.model,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    at: new Date(),
  })

  await prisma.tokenUsageLog.create({
    data: {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      feature: params.feature,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      estimatedCost,
      isServerKey: params.isServerKey,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  })
}

interface GetUsageParams {
  userId: string
  cursor?: string
  limit?: number
  feature?: UsageFeature
  startDate?: Date
  endDate?: Date
}

export async function getUserUsage(params: GetUsageParams) {
  const limit = Math.min(params.limit ?? 50, 100)

  return prisma.tokenUsageLog.findMany({
    where: {
      userId: params.userId,
      ...(params.feature ? { feature: params.feature } : {}),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    },
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    take: limit,
    orderBy: { createdAt: "desc" },
  })
}

interface UsageSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
  daily: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

export async function getUserUsageSummary(
  userId: string,
  startDate: Date,
  endDate: Date,
  tz: string = "UTC",
): Promise<UsageSummary> {
  const [totals, byFeature, byModel, logs] = await Promise.all([
    prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["feature"],
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["model"],
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
    }),
    prisma.$queryRaw<{ date: string; total_tokens: bigint; total_cost: string; count: bigint }[]>`
      SELECT
        DATE(created_at AT TIME ZONE ${tz}) as date,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as count
      FROM token_usage_logs
      WHERE user_id = ${userId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ])

  return {
    totalTokens: totals._sum.totalTokens ?? 0,
    totalCost: totals._sum.estimatedCost?.toNumber() ?? 0,
    requestCount: totals._count._all,
    byFeature: byFeature.map((f) => ({
      feature: f.feature,
      totalTokens: f._sum.totalTokens ?? 0,
      count: f._count._all,
    })),
    byModel: byModel.map((m) => ({
      model: m.model,
      totalTokens: m._sum.totalTokens ?? 0,
      totalCost: m._sum.estimatedCost?.toNumber() ?? 0,
    })),
    daily: logs.map((d) => ({
      date: d.date,
      totalTokens: Number(d.total_tokens),
      totalCost: parseFloat(d.total_cost ?? "0"),
      count: Number(d.count),
    })),
  }
}
