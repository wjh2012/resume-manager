import { prisma } from "@/lib/prisma"

interface CreatePricingParams {
  provider: string
  model: string
  inputPricePerM: number
  outputPricePerM: number
  effectiveFrom: Date
}

export async function createModelPricing(params: CreatePricingParams) {
  return prisma.modelPricing.create({ data: params })
}

export async function listModelPricing() {
  return prisma.modelPricing.findMany({
    orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
  })
}
