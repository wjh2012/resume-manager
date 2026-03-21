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

/**
 * Quota 초과 여부를 확인한다.
 *
 * NOTE: Soft limit — 동시 요청 시 체크와 기록 사이에 소폭 초과가 발생할 수 있다.
 * 이는 설계상 허용된 동작이며, 엄격한 제한이 필요하면 DB 레벨 잠금이 필요하다.
 * @see docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md
 */
export async function checkQuotaExceeded(
  userId: string,
): Promise<QuotaCheckResult> {
  const quotas = await prisma.quota.findMany({
    where: { userId, isActive: true },
  })

  if (quotas.length === 0) {
    return { exceeded: false }
  }

  // NOTE: N+1 쿼리 — 일반적으로 사용자당 quota는 1~3개이므로 허용 가능한 수준이다.
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
