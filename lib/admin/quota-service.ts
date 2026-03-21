import { prisma } from "@/lib/prisma"

interface CreateQuotaParams {
  userId: string
  limitType: "TOKENS" | "COST" | "REQUESTS"
  limitValue: number
  period: "DAILY" | "MONTHLY"
  isActive?: boolean
}

export async function createQuota(params: CreateQuotaParams) {
  return prisma.quota.create({ data: params })
}

export async function listQuotas() {
  return prisma.quota.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateQuota(id: string, data: { limitValue?: number; isActive?: boolean }) {
  return prisma.quota.update({ where: { id }, data })
}

export async function deleteQuota(id: string) {
  return prisma.quota.delete({ where: { id } })
}
