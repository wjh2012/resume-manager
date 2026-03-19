// components/interviews/interview-list.tsx
"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { InterviewCard } from "@/components/interviews/interview-card"

interface InterviewItem {
  id: string
  title: string
  companyName: string | null
  position: string | null
  status: string
  documentCount: number
  updatedAt: string
}

interface InterviewListProps {
  interviews: InterviewItem[]
}

export function InterviewList({ interviews }: InterviewListProps) {
  const router = useRouter()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [optimisticList, removeOptimistic] = useOptimistic(
    interviews,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))
      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("면접 세션이 삭제되었습니다.")
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

  if (optimisticList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">아직 진행한 모의면접이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {optimisticList.map((item) => (
        <InterviewCard
          key={item.id}
          {...item}
          isDeleting={deletingIds.has(item.id)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
