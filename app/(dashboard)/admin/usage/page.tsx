"use client"

import { useState, useEffect, useReducer } from "react"
import { PeriodFilter } from "@/components/usage/period-filter"
import { SystemSummary } from "@/components/admin/system-summary"
import { UserRankingTable } from "@/components/admin/user-ranking-table"
import { DistributionCharts } from "@/components/admin/distribution-charts"
import { DailyChart } from "@/components/usage/daily-chart"

interface SystemUsage {
  totalTokens: number
  totalCost: number
  requestCount: number
  activeUsers: number
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
  daily: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

interface UserRanking {
  userId: string
  email: string
  name: string | null
  totalTokens: number
  totalCost: number
  requestCount: number
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; usage: SystemUsage; rankings: UserRanking[] }

export default function AdminUsagePage() {
  const [period, setPeriod] = useState("30d")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [fetchState, setFetchState] = useReducer(
    (_prev: FetchState, next: FetchState) => next,
    { status: "loading" },
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (period !== "custom") {
      params.set("period", period)
    }

    setFetchState({ status: "loading" })

    Promise.all([
      fetch(`/api/admin/token-usage?${params}`).then((r) => {
        if (!r.ok) throw new Error("시스템 사용량을 불러올 수 없습니다.")
        return r.json() as Promise<SystemUsage>
      }),
      fetch(`/api/admin/token-usage/users?${params}`).then((r) => {
        if (!r.ok) throw new Error("사용자 랭킹을 불러올 수 없습니다.")
        return r.json() as Promise<{ data: UserRanking[] }>
      }),
    ])
      .then(([usage, rankingsRes]) =>
        setFetchState({
          status: "success",
          usage,
          rankings: rankingsRes.data,
        }),
      )
      .catch((e: Error) =>
        setFetchState({ status: "error", message: e.message }),
      )
  }, [period, startDate, endDate])

  function handlePeriodChange(
    newPeriod: string,
    newStart?: Date,
    newEnd?: Date,
  ) {
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

  const { usage, rankings } = fetchState

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용량 모니터링</h1>
        <PeriodFilter
          value={period}
          startDate={startDate}
          endDate={endDate}
          onChange={handlePeriodChange}
        />
      </div>
      <SystemSummary
        totalTokens={usage.totalTokens}
        totalCost={usage.totalCost}
        requestCount={usage.requestCount}
        activeUsers={usage.activeUsers}
      />
      <DailyChart data={usage.daily} />
      <DistributionCharts
        byFeature={usage.byFeature}
        byModel={usage.byModel}
      />
      <UserRankingTable data={rankings} />
    </div>
  )
}
