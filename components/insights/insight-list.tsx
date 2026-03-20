"use client"

import { useCallback, useOptimistic, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Clock } from "lucide-react"

import { InsightCard, type InsightCardData } from "./insight-card"
import { InsightEditDialog } from "./insight-edit-dialog"

const CATEGORY_TABS = [
  { value: "all", label: "전체" },
  { value: "strength", label: "강점" },
  { value: "experience", label: "경험" },
  { value: "motivation", label: "동기" },
  { value: "skill", label: "기술" },
  { value: "other", label: "기타" },
] as const

interface CategoryCount {
  category: string
  _count: { _all: number }
}

interface InsightListProps {
  insights: InsightCardData[]
  categoryCounts: CategoryCount[]
  currentCategory: string
  currentSort: string
}

export function InsightList({
  insights,
  categoryCounts,
  currentCategory,
  currentSort,
}: InsightListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingInsight, setEditingInsight] = useState<InsightCardData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [optimisticList, removeOptimistic] = useOptimistic(
    insights,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  )

  const totalCount = categoryCounts.reduce((sum, c) => sum + c._count._all, 0)

  const getCount = (category: string) => {
    if (category === "all") return totalCount
    return categoryCounts.find((c) => c.category === category)?._count._all ?? 0
  }

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("category")
    } else {
      params.set("category", value)
    }
    router.push(`/insights?${params.toString()}`)
  }

  const handleSortToggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    const newSort = currentSort === "category" ? "time" : "category"
    params.set("sort", newSort)
    router.push(`/insights?${params.toString()}`)
  }

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))
      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/insights/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "삭제에 실패했습니다.")
        }
        toast.success("인사이트가 삭제되었습니다.")
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "삭제에 실패했습니다."
        toast.error(message)
        router.refresh()
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [removeOptimistic, router, startTransition],
  )

  const handleEdit = (insight: InsightCardData) => {
    setEditingInsight(insight)
    setEditDialogOpen(true)
  }

  const groupedInsights = currentSort === "category"
    ? CATEGORY_TABS
        .filter((tab) => tab.value !== "all")
        .map((tab) => ({
          category: tab.value,
          label: tab.label,
          items: optimisticList.filter((i) => i.category === tab.value),
        }))
        .filter((group) => group.items.length > 0)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={currentCategory} onValueChange={handleCategoryChange}>
          <TabsList>
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="text-muted-foreground ml-1 text-xs">
                  {getCount(tab.value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={handleSortToggle}>
          {currentSort === "category" ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              시간순
            </>
          ) : (
            <>
              <LayoutGrid className="mr-2 h-4 w-4" />
              카테고리별
            </>
          )}
        </Button>
      </div>

      {optimisticList.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          아직 추출된 인사이트가 없습니다. 자기소개서나 면접 대화에서 추출해보세요.
        </p>
      ) : groupedInsights ? (
        <div className="space-y-6">
          {groupedInsights.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-semibold">{group.label}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isDeleting={deletingIds.has(insight.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {optimisticList.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(insight.id)}
            />
          ))}
        </div>
      )}

      <InsightEditDialog
        key={editingInsight?.id}
        insight={editingInsight}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
