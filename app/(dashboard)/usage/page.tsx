"use client"

import { useState, useEffect, useTransition } from "react"
import { SummaryCards } from "@/components/usage/summary-cards"
import { DailyChart } from "@/components/usage/daily-chart"
import { FeatureChart } from "@/components/usage/feature-chart"
import { ModelChart } from "@/components/usage/model-chart"
import { PeriodFilter } from "@/components/usage/period-filter"
import { QuotaProgress } from "@/components/usage/quota-progress"

interface UsageSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
  quotas: {
    id: string
    limitType: string
    limitValue: number
    period: string
    currentUsage: number
  }[]
  daily: { date: string; totalTokens: number; totalCost: number; count: number }[]
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
}

export default function UsagePage() {
  const [period, setPeriod] = useState("30d")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [data, setData] = useState<UsageSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      let url: string
      if (period === "custom" && startDate && endDate) {
        const start = startDate.toISOString().split("T")[0]
        const end = endDate.toISOString().split("T")[0]
        url = `/api/token-usage/summary?startDate=${start}&endDate=${end}`
      } else if (period !== "custom") {
        url = `/api/token-usage/summary?period=${period}`
      } else {
        return
      }

      fetch(url)
        .then((r) => r.json())
        .then((json: UsageSummary) => setData(json))
        .catch(() => setData(null))
    })
  }, [period, startDate, endDate])

  function handlePeriodChange(p: string, start?: Date, end?: Date) {
    setPeriod(p)
    setStartDate(start)
    setEndDate(end)
  }

  if (isPending || !data) {
    return <div className="p-6">로딩 중...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용량</h1>
        <PeriodFilter
          value={period}
          startDate={startDate}
          endDate={endDate}
          onChange={handlePeriodChange}
        />
      </div>

      <SummaryCards
        totalTokens={data.totalTokens}
        totalCost={data.totalCost}
        requestCount={data.requestCount}
      />

      <QuotaProgress quotas={data.quotas} />

      <DailyChart data={data.daily} />

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureChart data={data.byFeature} />
        <ModelChart data={data.byModel} />
      </div>
    </div>
  )
}
