"use client"

import { useState, useEffect, useReducer } from "react"
import { SummaryCards } from "@/components/usage/summary-cards"
import { DailyChart } from "@/components/usage/daily-chart"
import { FeatureChart } from "@/components/usage/feature-chart"
import { ModelChart } from "@/components/usage/model-chart"
import { PeriodFilter } from "@/components/usage/period-filter"
import { QuotaProgress } from "@/components/usage/quota-progress"
import type { UsageSummaryWithQuotas } from "@/types/token-usage"

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: UsageSummaryWithQuotas }

export default function UsagePage() {
  const [period, setPeriod] = useState("30d")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [fetchState, setFetchState] = useReducer(
    (_prev: FetchState, next: FetchState) => next,
    { status: "loading" },
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (period === "custom" && startDate && endDate) {
      params.set("startDate", startDate.toISOString())
      params.set("endDate", endDate.toISOString())
    } else if (period !== "custom") {
      params.set("period", period)
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    params.set("tz", tz)

    setFetchState({ status: "loading" })

    fetch(`/api/token-usage/summary?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("데이터를 불러올 수 없습니다.")
        return r.json() as Promise<UsageSummaryWithQuotas>
      })
      .then((data) => setFetchState({ status: "success", data }))
      .catch((e: Error) => setFetchState({ status: "error", message: e.message }))
  }, [period, startDate, endDate])

  function handlePeriodChange(newPeriod: string, newStart?: Date, newEnd?: Date) {
    setPeriod(newPeriod)
    setStartDate(newStart)
    setEndDate(newEnd)
  }

  if (fetchState.status === "loading") {
    return <div className="p-6">로딩 중...</div>
  }

  if (fetchState.status === "error") {
    return <div className="p-6 text-destructive">{fetchState.message}</div>
  }

  const { data } = fetchState

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용량</h1>
        <PeriodFilter value={period} startDate={startDate} endDate={endDate} onChange={handlePeriodChange} />
      </div>
      <SummaryCards totalTokens={data.totalTokens} totalCost={data.totalCost} requestCount={data.requestCount} />
      <QuotaProgress quotas={data.quotas} />
      <DailyChart data={data.daily} />
      <div className="grid gap-4 md:grid-cols-2">
        <FeatureChart data={data.byFeature} />
        <ModelChart data={data.byModel} />
      </div>
    </div>
  )
}
