"use client"

import { useState, useEffect, useReducer, useCallback } from "react"
import type { PricingEntry } from "@/types/admin"
import { PricingTable } from "@/components/admin/pricing-table"

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: PricingEntry[] }

export default function AdminModelPricingPage() {
  const [fetchState, setFetchState] = useReducer(
    (_prev: FetchState, next: FetchState) => next,
    { status: "loading" },
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    setFetchState({ status: "loading" })

    fetch("/api/admin/model-pricing")
      .then((r) => {
        if (!r.ok) throw new Error("단가 목록을 불러올 수 없습니다.")
        return r.json() as Promise<{ data: PricingEntry[] }>
      })
      .then((res) => setFetchState({ status: "success", data: res.data }))
      .catch((e: Error) =>
        setFetchState({ status: "error", message: e.message }),
      )
  }, [refreshKey])

  if (fetchState.status === "loading") {
    return <div className="p-6">로딩 중...</div>
  }

  if (fetchState.status === "error") {
    return <div className="p-6 text-destructive">{fetchState.message}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">모델 단가</h1>
      <PricingTable data={fetchState.data} onCreated={reload} />
    </div>
  )
}
