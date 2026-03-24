"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { ExternalDocumentCard } from "@/components/external-documents/external-document-card"

interface ExternalDocument {
  id: string
  title: string
  category: string
  sourceType: string
  fileType: string | null
  fileSize: number | null
  summary: string | null
  createdAt: string
}

interface ExternalDocumentListProps {
  documents: ExternalDocument[]
}

export function ExternalDocumentList({ documents }: ExternalDocumentListProps) {
  const router = useRouter()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const [optimisticDocs, removeOptimistic] = useOptimistic(
    documents,
    (state, deletedId: string) => state.filter((doc) => doc.id !== deletedId),
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))

      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/external-documents/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("외부 문서가 삭제되었습니다.")
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

  if (optimisticDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText aria-hidden="true" className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">
          아직 등록한 외부 문서가 없습니다
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          채용공고, 기업 정보 등 외부 문서를 등록하여 시작하세요
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {optimisticDocs.map((doc, index) => (
        <div
          key={doc.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ExternalDocumentCard
            document={doc}
            onDelete={handleDelete}
            isDeleting={deletingIds.has(doc.id)}
          />
        </div>
      ))}
    </div>
  )
}
