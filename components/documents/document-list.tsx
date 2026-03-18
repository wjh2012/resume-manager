"use client"

import { useState, useCallback, useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { DocumentCard } from "@/components/documents/document-card"

interface Document {
  id: string
  title: string
  type: string
  fileSize: number
  createdAt: string
  _count: { chunks: number }
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
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
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.")
        }

        toast.success("문서가 삭제되었습니다.")
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
          아직 업로드한 문서가 없습니다
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          PDF, DOCX, TXT 파일을 업로드하여 시작하세요
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {optimisticDocs.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={handleDelete}
          isDeleting={deletingIds.has(doc.id)}
        />
      ))}
    </div>
  )
}
