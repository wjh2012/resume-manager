import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export class QuotaExceededError extends Error {
  constructor() {
    super("사용 한도를 초과했습니다.")
  }
}

interface QuotaCheckResult {
  exceeded: boolean
  limitType?: string
  limitValue?: Prisma.Decimal
  currentUsage?: number
}

function getPeriodStart(period: string): Date {
  const now = new Date()
  if (period === "DAILY") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  // MONTHLY
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function checkQuotaExceeded(
  userId: string,
): Promise<QuotaCheckResult> {
  const quotas = await prisma.quota.findMany({
    where: { userId, isActive: true },
  })

  if (quotas.length === 0) {
    return { exceeded: false }
  }

  for (const quota of quotas) {
    const periodStart = getPeriodStart(quota.period)

    if (quota.limitType === "TOKENS") {
      const agg = await prisma.tokenUsageLog.aggregate({
        where: { userId, createdAt: { gte: periodStart } },
        _sum: { totalTokens: true },
      })
      const used = agg._sum.totalTokens ?? 0
      if (used >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "TOKENS", limitValue: quota.limitValue, currentUsage: used }
      }
    } else if (quota.limitType === "COST") {
      const agg = await prisma.tokenUsageLog.aggregate({
        where: { userId, createdAt: { gte: periodStart } },
        _sum: { estimatedCost: true },
      })
      const used = agg._sum.estimatedCost?.toNumber() ?? 0
      if (used >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "COST", limitValue: quota.limitValue, currentUsage: used }
      }
    } else if (quota.limitType === "REQUESTS") {
      const count = await prisma.tokenUsageLog.count({
        where: { userId, createdAt: { gte: periodStart } },
      })
      if (count >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "REQUESTS", limitValue: quota.limitValue, currentUsage: count }
      }
    }
  }

  return { exceeded: false }
}

export async function getUserQuotas(userId: string) {
  return prisma.quota.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

// Quota + 현재 사용량을 함께 반환 (대시보드 프로그레스 바용)
export async function getUserQuotasWithUsage(userId: string) {
  const quotas = await prisma.quota.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  })

  return Promise.all(
    quotas.map(async (quota) => {
      const periodStart = getPeriodStart(quota.period)
      let currentUsage = 0

      if (quota.limitType === "TOKENS") {
        const agg = await prisma.tokenUsageLog.aggregate({
          where: { userId, createdAt: { gte: periodStart } },
          _sum: { totalTokens: true },
        })
        currentUsage = agg._sum.totalTokens ?? 0
      } else if (quota.limitType === "COST") {
        const agg = await prisma.tokenUsageLog.aggregate({
          where: { userId, createdAt: { gte: periodStart } },
          _sum: { estimatedCost: true },
        })
        currentUsage = agg._sum.estimatedCost?.toNumber() ?? 0
      } else if (quota.limitType === "REQUESTS") {
        currentUsage = await prisma.tokenUsageLog.count({
          where: { userId, createdAt: { gte: periodStart } },
        })
      }

      return {
        id: quota.id,
        limitType: quota.limitType,
        limitValue: quota.limitValue.toNumber(),
        period: quota.period,
        currentUsage,
      }
    }),
  )
}
