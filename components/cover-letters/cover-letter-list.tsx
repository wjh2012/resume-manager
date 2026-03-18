"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PenTool } from "lucide-react"
import { toast } from "sonner"

import { CoverLetterCard } from "@/components/cover-letters/cover-letter-card"

interface CoverLetter {
  id: string
  title: string
  companyName: string
  position: string
  status: string
  createdAt: string
  updatedAt: string
}

interface CoverLetterListProps {
  coverLetters: CoverLetter[]
}

export function CoverLetterList({ coverLetters }: CoverLetterListProps) {
  const router = useRouter()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [optimisticList, removeOptimistic] = useOptimistic(
    coverLetters,
    (state, deletedId: string) => state.filter((cl) => cl.id !== deletedId),
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))

      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/cover-letters/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("자기소개서가 삭제되었습니다.")
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
        <PenTool aria-hidden="true" className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">
          아직 작성한 자기소개서가 없습니다
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          새 자기소개서를 만들어 AI와 함께 작성해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {optimisticList.map((cl, index) => (
        <div
          key={cl.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CoverLetterCard
            coverLetter={cl}
            onDelete={handleDelete}
            isDeleting={deletingIds.has(cl.id)}
          />
        </div>
      ))}
    </div>
  )
}
