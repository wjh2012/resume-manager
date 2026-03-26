"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, X, Pencil, Loader2, ArrowRight } from "lucide-react"

interface NoteData {
  id: string
  title: string
  content: string
  metadata: Record<string, string | undefined> | null
}

interface Proposal {
  id: string
  sourceNote: NoteData | null
  targetNote: NoteData
  suggestedTitle: string
  suggestedContent: string
  suggestedMetadata: Record<string, string | undefined> | null
  status: string
}

interface MergeProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// METADATA_LABELS for display
const METADATA_LABELS: Record<string, string> = {
  where: "환경",
  role: "역할",
  what: "행동",
  result: "성과",
  challenge: "도전",
  motivation: "동기",
  feeling: "느낀 점",
  lesson: "배운 점",
}

export function MergeProposalDialog({ open, onOpenChange }: MergeProposalDialogProps) {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedContent, setEditedContent] = useState("")

  // Fetch proposals when dialog opens
  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    fetch("/api/career-notes/merge-proposals")
      .then((res) => res.json())
      .then((data) => {
        setProposals(data.proposals ?? [])
        setCurrentIndex(0)
      })
      .catch(() => toast.error("병합 제안을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false))
  }, [open])

  const current = proposals[currentIndex]

  const handleResolve = useCallback(
    async (action: "accept" | "reject") => {
      if (!current) return
      setIsResolving(true)
      try {
        const body: Record<string, unknown> = { action }
        if (action === "accept" && isEditing) {
          body.editedTitle = editedTitle
          body.editedContent = editedContent
        }

        const res = await fetch(
          `/api/career-notes/merge-proposals/${current.id}/resolve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "처리에 실패했습니다.")
        }

        toast.success(action === "accept" ? "병합되었습니다." : "거부되었습니다.")

        // Remove resolved proposal and move to next
        const remaining = proposals.filter((_, i) => i !== currentIndex)
        setProposals(remaining)
        if (remaining.length === 0) {
          onOpenChange(false)
        } else {
          setCurrentIndex(Math.min(currentIndex, remaining.length - 1))
        }
        setIsEditing(false)
        router.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : "처리에 실패했습니다."
        toast.error(message)
      } finally {
        setIsResolving(false)
      }
    },
    [current, currentIndex, proposals, isEditing, editedTitle, editedContent, onOpenChange, router],
  )

  const startEditing = useCallback(() => {
    if (!current) return
    setEditedTitle(current.suggestedTitle)
    setEditedContent(current.suggestedContent)
    setIsEditing(true)
  }, [current])

  // Helper to render metadata
  function renderMetadata(metadata: Record<string, string | undefined> | null) {
    if (!metadata) return null
    const entries = Object.entries(metadata).filter(([, v]) => v)
    if (entries.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {entries.map(([key, value]) => (
          <Badge key={key} variant="secondary" className="text-xs">
            {METADATA_LABELS[key] ?? key}: {value}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            병합 제안 {proposals.length > 0 ? `(${currentIndex + 1}/${proposals.length})` : ""}
          </DialogTitle>
          <DialogDescription>유사한 커리어노트를 하나로 병합합니다.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !current ? (
          <p className="text-muted-foreground py-8 text-center">
            처리할 병합 제안이 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Comparison view */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Existing note (target) */}
              <div className="space-y-2 rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">기존 노트</p>
                <h4 className="font-semibold">{current.targetNote.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {current.targetNote.content}
                </p>
                {renderMetadata(current.targetNote.metadata)}
              </div>

              {/* New note (source) */}
              <div className="space-y-2 rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">새 노트</p>
                <h4 className="font-semibold">{current.sourceNote?.title ?? "(삭제됨)"}</h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {current.sourceNote?.content ?? ""}
                </p>
                {current.sourceNote && renderMetadata(current.sourceNote.metadata)}
              </div>
            </div>

            <Separator />

            {/* AI suggestion or edit mode */}
            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-primary">
                  {isEditing ? "병합 결과 편집" : "AI 병합 제안"}
                </p>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="제목"
                    aria-label="병합 결과 제목"
                  />
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="내용"
                    aria-label="병합 결과 내용"
                    rows={4}
                  />
                </div>
              ) : (
                <>
                  <h4 className="font-semibold">{current.suggestedTitle}</h4>
                  <p className="text-sm text-muted-foreground">{current.suggestedContent}</p>
                  {renderMetadata(current.suggestedMetadata)}
                </>
              )}
            </div>

            <p role="status" className="sr-only">
              {isLoading
                ? "병합 제안을 불러오는 중입니다..."
                : isResolving
                  ? "처리 중입니다..."
                  : ""}
            </p>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve("reject")}
                disabled={isResolving}
              >
                <X aria-hidden="true" className="mr-1 h-4 w-4" />
                거부 (별도 노트로 유지)
              </Button>
              {isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isResolving}
                >
                  편집 취소
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  disabled={isResolving}
                >
                  <Pencil aria-hidden="true" className="mr-1 h-4 w-4" />
                  편집 후 승인
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => handleResolve("accept")}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 aria-hidden="true" className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="mr-1 h-4 w-4" />
                )}
                {isEditing ? "편집 내용으로 승인" : "승인"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
