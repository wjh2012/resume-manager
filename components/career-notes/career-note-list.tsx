"use client"

import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownUp, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"

import { CareerNoteCard, type CareerNoteCardData } from "./career-note-card"
import { CareerNoteEditDialog } from "./career-note-edit-dialog"
import { MergeProposalBanner } from "./merge-proposal-banner"
import { MergeProposalDialog } from "./merge-proposal-dialog"

interface CareerNoteListProps {
  notes: CareerNoteCardData[]
  counts: { confirmed: number; pending: number; total: number }
  pendingProposalCount: number
}

export function CareerNoteList({
  notes,
  counts,
  pendingProposalCount,
}: CareerNoteListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingNote, setEditingNote] = useState<CareerNoteCardData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [showProposals, setShowProposals] = useState(false)
  const [currentSortState, setCurrentSortState] = useState<"newest" | "oldest">("newest")

  const [optimisticList, removeOptimistic] = useOptimistic(
    notes,
    (state, deletedId: string) => state.filter((item) => item.id !== deletedId),
  )

  const sortedList = useMemo(() => {
    return [...optimisticList].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return currentSortState === "newest" ? -diff : diff
    })
  }, [optimisticList, currentSortState])

  const handleSortToggle = () => {
    setCurrentSortState((prev) => (prev === "newest" ? "oldest" : "newest"))
  }

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id))
      startTransition(() => {
        removeOptimistic(id)
      })

      try {
        const res = await fetch(`/api/career-notes/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "삭제에 실패했습니다.")
        }
        toast.success("커리어노트가 삭제되었습니다.")
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

  const handleEdit = (note: CareerNoteCardData) => {
    setEditingNote(note)
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <MergeProposalBanner count={pendingProposalCount} onViewProposals={() => setShowProposals(true)} />

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          전체 {counts.total}개
        </p>
        <Button variant="outline" size="sm" onClick={handleSortToggle}>
          {currentSortState === "newest" ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              오래된순
            </>
          ) : (
            <>
              <ArrowDownUp className="mr-2 h-4 w-4" />
              최신순
            </>
          )}
        </Button>
      </div>

      {sortedList.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          아직 커리어노트가 없습니다. 자기소개서나 면접 대화에서 추출해보세요.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedList.map((note) => (
            <CareerNoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(note.id)}
            />
          ))}
        </div>
      )}

      <CareerNoteEditDialog
        key={editingNote?.id}
        note={editingNote}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => router.refresh()}
      />

      <MergeProposalDialog open={showProposals} onOpenChange={setShowProposals} />
    </div>
  )
}
