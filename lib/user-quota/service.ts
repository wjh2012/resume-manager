import { prisma } from "@/lib/prisma"

interface CreateUserQuotaParams {
  userId: string
  limitType: "TOKENS" | "COST"
  limitValue: number
  isActive?: boolean
}

export async function listUserQuotas(userId: string) {
  return prisma.userQuota.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createUserQuota(params: CreateUserQuotaParams) {
  return prisma.userQuota.create({ data: params })
}

export async function updateUserQuota(
  id: string,
  userId: string,
  data: { limitValue?: number; isActive?: boolean },
) {
  const { count } = await prisma.userQuota.updateMany({
    where: { id, userId },
    data,
  })
  if (count === 0) return null

  return prisma.userQuota.findUnique({ where: { id } })
}

export async function deleteUserQuota(id: string, userId: string) {
  const { count } = await prisma.userQuota.deleteMany({
    where: { id, userId },
  })
  return count > 0
}
