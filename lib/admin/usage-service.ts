import { prisma } from "@/lib/prisma"

export async function getSystemUsageSummary(startDate: Date, endDate: Date) {
  const [totals, byFeature, byModel, activeUsers, daily] = await Promise.all([
    prisma.tokenUsageLog.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["model"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM token_usage_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    `.then((r) => Number(r[0].count)),
    prisma.$queryRaw<{ date: string; total_tokens: bigint; total_cost: string; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as count
      FROM token_usage_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ])

  return {
    totalTokens: totals._sum.totalTokens ?? 0,
    totalCost: totals._sum.estimatedCost?.toNumber() ?? 0,
    requestCount: totals._count._all,
    activeUsers,
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
    daily: daily.map((d) => ({
      date: d.date,
      totalTokens: Number(d.total_tokens),
      totalCost: parseFloat(d.total_cost ?? "0"),
      count: Number(d.count),
    })),
  }
}

interface UserRankingParams {
  startDate: Date
  endDate: Date
  limit?: number
}

export async function getUserRanking(params: UserRankingParams) {
  const limit = Math.min(params.limit ?? 50, 100)

  const rankings = await prisma.$queryRaw<
    {
      user_id: string
      email: string
      name: string | null
      total_tokens: bigint
      total_cost: string
      request_count: bigint
    }[]
  >`
    SELECT
      u.id as user_id,
      u.email,
      u.name,
      SUM(t.total_tokens) as total_tokens,
      SUM(t.estimated_cost) as total_cost,
      COUNT(*) as request_count
    FROM token_usage_logs t
    JOIN users u ON u.id = t.user_id
    WHERE t.created_at >= ${params.startDate}
      AND t.created_at <= ${params.endDate}
    GROUP BY u.id, u.email, u.name
    ORDER BY total_tokens DESC
    LIMIT ${limit}
  `

  return rankings.map((r) => ({
    userId: r.user_id,
    email: r.email,
    name: r.name,
    totalTokens: Number(r.total_tokens),
    totalCost: parseFloat(r.total_cost ?? "0"),
    requestCount: Number(r.request_count),
  }))
}
