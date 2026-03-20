import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Lightbulb } from "lucide-react"

import { getAuthUser } from "@/lib/supabase/user"
import { listInsights, countByCategory } from "@/lib/insights/service"
import { InsightList } from "@/components/insights/insight-list"

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
    <div className="h-full space-y-6 overflow-y-auto">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6" />
        <h1 className="text-2xl font-bold">인사이트</h1>
      </div>

      <Suspense
        fallback={
          <p className="text-muted-foreground py-12 text-center">
            불러오는 중...
          </p>
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
