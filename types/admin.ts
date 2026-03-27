export interface QuotaEntry {
  id: string
  userId: string
  limitType: string
  limitValue: number
  period: string
  isActive: boolean
  user: { email: string; name: string | null }
}

export interface PricingEntry {
  id: string
  provider: string
  model: string
  inputPricePerM: number
  outputPricePerM: number
  effectiveFrom: string
}
