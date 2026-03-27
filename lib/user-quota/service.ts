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
  const quota = await prisma.userQuota.findFirst({
    where: { id, userId },
  })
  if (!quota) return null

  return prisma.userQuota.update({ where: { id }, data })
}

export async function deleteUserQuota(id: string, userId: string) {
  const quota = await prisma.userQuota.findFirst({
    where: { id, userId },
  })
  if (!quota) return false

  await prisma.userQuota.delete({ where: { id } })
  return true
}
