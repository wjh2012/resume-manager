import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export class QuotaExceededError extends Error {
  public readonly source: "ADMIN" | "USER"
  constructor(source: "ADMIN" | "USER" = "ADMIN") {
    super(source === "USER" ? "설정하신 자기 제한을 초과했습니다." : "사용 한도를 초과했습니다.")
    this.source = source
  }
}

interface QuotaCheckResult {
  exceeded: boolean
  limitType?: string
  limitValue?: Prisma.Decimal
  currentUsage?: number
  source?: "ADMIN" | "USER"
}

function getPeriodStart(period: string): Date {
  const now = new Date()
  if (period === "DAILY") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }
  // MONTHLY
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

async function checkSingleQuota(
  userId: string,
  limitType: string,
  limitValue: Prisma.Decimal,
  periodStart: Date,
): Promise<QuotaCheckResult | null> {
  if (limitType === "TOKENS") {
    const agg = await prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: periodStart } },
      _sum: { totalTokens: true },
    })
    const used = agg._sum.totalTokens ?? 0
    if (used >= limitValue.toNumber()) {
      return { exceeded: true, limitType: "TOKENS", limitValue, currentUsage: used }
    }
  } else if (limitType === "COST") {
    const agg = await prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: periodStart } },
      _sum: { estimatedCost: true },
    })
    const used = agg._sum.estimatedCost?.toNumber() ?? 0
    if (used >= limitValue.toNumber()) {
      return { exceeded: true, limitType: "COST", limitValue, currentUsage: used }
    }
  } else if (limitType === "REQUESTS") {
    const count = await prisma.tokenUsageLog.count({
      where: { userId, createdAt: { gte: periodStart } },
    })
    if (count >= limitValue.toNumber()) {
      return { exceeded: true, limitType: "REQUESTS", limitValue, currentUsage: count }
    }
  }
  return null
}

/**
 * Quota 초과 여부를 확인한다 (Admin Quota + UserQuota).
 *
 * NOTE: Soft limit — 동시 요청 시 체크와 기록 사이에 소폭 초과가 발생할 수 있다.
 * 이는 설계상 허용된 동작이며, 엄격한 제한이 필요하면 DB 레벨 잠금이 필요하다.
 * @see docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md
 */
export async function checkQuotaExceeded(
  userId: string,
): Promise<QuotaCheckResult> {
  const [adminQuotas, userQuotas] = await Promise.all([
    prisma.quota.findMany({ where: { userId, isActive: true } }),
    prisma.userQuota.findMany({ where: { userId, isActive: true } }),
  ])

  if (adminQuotas.length === 0 && userQuotas.length === 0) {
    return { exceeded: false }
  }

  // NOTE: N+1 쿼리 — 일반적으로 사용자당 quota는 1~3개이므로 허용 가능한 수준이다.
  // Admin quota 우선 검사
  for (const quota of adminQuotas) {
    const periodStart = getPeriodStart(quota.period)
    const result = await checkSingleQuota(userId, quota.limitType, quota.limitValue, periodStart)
    if (result) {
      return { ...result, source: "ADMIN" }
    }
  }

  // UserQuota 검사 (항상 MONTHLY)
  const monthlyStart = getPeriodStart("MONTHLY")
  for (const quota of userQuotas) {
    const result = await checkSingleQuota(userId, quota.limitType, quota.limitValue, monthlyStart)
    if (result) {
      return { ...result, source: "USER" }
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

// UserQuota + 현재 사용량을 함께 반환 (대시보드 프로그레스 바용)
export async function getUserUserQuotasWithUsage(userId: string) {
  const quotas = await prisma.userQuota.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  if (quotas.length === 0) return []

  const periodStart = getPeriodStart("MONTHLY")

  // 한 번의 집계로 토큰 + 비용 모두 조회
  const agg = await prisma.tokenUsageLog.aggregate({
    where: { userId, createdAt: { gte: periodStart } },
    _sum: { totalTokens: true, estimatedCost: true },
  })

  const usageByType: Record<string, number> = {
    TOKENS: agg._sum.totalTokens ?? 0,
    COST: agg._sum.estimatedCost?.toNumber() ?? 0,
  }

  return quotas.map((quota) => ({
    id: quota.id,
    limitType: quota.limitType,
    limitValue: quota.limitValue.toNumber(),
    isActive: quota.isActive,
    currentUsage: usageByType[quota.limitType] ?? 0,
  }))
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
