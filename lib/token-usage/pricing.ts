import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

interface CalculateCostParams {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  at: Date
}

export async function calculateCost(
  params: CalculateCostParams,
): Promise<Prisma.Decimal | null> {
  const pricing = await prisma.modelPricing.findFirst({
    where: {
      provider: params.provider,
      model: params.model,
      effectiveFrom: { lte: params.at },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  if (!pricing) return null

  const inputCost = new Prisma.Decimal(params.promptTokens)
    .mul(pricing.inputPricePerM)
    .div(1_000_000)
  const outputCost = new Prisma.Decimal(params.completionTokens)
    .mul(pricing.outputPricePerM)
    .div(1_000_000)

  return inputCost.add(outputCost)
}

export async function getCurrentPricing() {
  const allPricing = await prisma.modelPricing.findMany({
    orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
  })

  // 각 (provider, model)별 최신 단가만 반환
  const latest = new Map<string, (typeof allPricing)[0]>()
  for (const p of allPricing) {
    const key = `${p.provider}:${p.model}`
    if (!latest.has(key)) {
      latest.set(key, p)
    }
  }

  return Array.from(latest.values())
}
