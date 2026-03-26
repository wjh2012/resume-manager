import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Lightbulb } from "lucide-react"

import { getAuthUser } from "@/lib/supabase/user"
import { listInsights, countByCategory } from "@/lib/insights/service"
import { InsightList } from "@/components/insights/insight-list"
import { Skeleton } from "@/components/ui/skeleton"

interface PageProps {
  searchParams: Promise<{ category?: string; sort?: string }>
}

async function InsightListSection({
  userId,
  category,
  sort,
}: {
  userId: string
  category?: string
  sort: string
}) {
  const [insights, categoryCounts] = await Promise.all([
    listInsights(userId, category),
    countByCategory(userId),
  ])

  const serialized = insights.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }))

  return (
    <InsightList
      insights={serialized}
      categoryCounts={categoryCounts}
      currentCategory={category ?? "all"}
      currentSort={sort}
    />
  )
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { category, sort = "time" } = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6" />
        <h1 className="text-2xl font-bold">인사이트</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-md" />
                ))}
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="space-y-3 rounded-xl border p-6">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <InsightListSection
          userId={user.id}
          category={category}
          sort={sort}
        />
      </Suspense>
    </div>
  )
}
