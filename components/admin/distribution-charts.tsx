"use client"

import { FeatureChart } from "@/components/usage/feature-chart"
import { ModelChart } from "@/components/usage/model-chart"

interface DistributionChartsProps {
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
}

export function DistributionCharts({
  byFeature,
  byModel,
}: DistributionChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FeatureChart data={byFeature} />
      <ModelChart data={byModel} />
    </div>
  )
}
