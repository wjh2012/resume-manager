export interface UsageSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
  daily: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

export interface UsageSummaryWithQuotas extends UsageSummary {
  quotas: { id: string; limitType: string; limitValue: number; period: string; currentUsage: number }[]
}
