"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileCheck } from "lucide-react"
import { toast } from "sonner"

import { ResumeCard } from "@/components/resumes/resume-card"

interface Resume {
  id: string
  title: string
  template: string
  createdAt: string
  updatedAt: string
}

interface ResumeListProps {
  resumes: Resume[]
}

export function ResumeList({ resumes }: ResumeListProps) {
  const router = useRouter()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [optimisticList, removeOptimistic] = useOptimistic(
    resumes,
    (state, deletedId: string) => state.filter((r) => r.id !== deletedId),
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))

      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("이력서가 삭제되었습니다.")
        router.refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "삭제에 실패했습니다."
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
    [router, removeOptimistic, startTransition],
  )

  if (optimisticList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileCheck aria-hidden="true" className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">
          아직 작성한 이력서가 없습니다
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          새 이력서를 만들어보세요
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {optimisticList.map((r, index) => (
        <div
          key={r.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ResumeCard
            resume={r}
            onDelete={handleDelete}
            isDeleting={deletingIds.has(r.id)}
          />
        </div>
      ))}
    </div>
  )
}
