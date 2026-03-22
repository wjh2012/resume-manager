"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { CareerNoteCardData } from "./career-note-card"

const METADATA_FIELDS = [
  { key: "where", label: "환경" },
  { key: "role", label: "역할" },
  { key: "what", label: "행동" },
  { key: "result", label: "성과" },
  { key: "challenge", label: "도전" },
  { key: "motivation", label: "동기" },
  { key: "feeling", label: "느낀 점" },
  { key: "lesson", label: "배운 점" },
] as const

interface CareerNoteEditDialogProps {
  note: CareerNoteCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CareerNoteEditDialog({
  note,
  open,
  onOpenChange,
  onSuccess,
}: CareerNoteEditDialogProps) {
  const [title, setTitle] = useState(note?.title ?? "")
  const [content, setContent] = useState(note?.content ?? "")
  const [metadata, setMetadata] = useState<Record<string, string>>(() =>
    buildMetadataState(note?.metadata),
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setMetadata(buildMetadataState(note.metadata))
    }
  }, [note])

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note) return

    setIsSaving(true)
    try {
      // Filter out empty metadata values
      const filteredMetadata: Record<string, string> = {}
      for (const [key, value] of Object.entries(metadata)) {
        if (value.trim()) {
          filteredMetadata[key] = value.trim()
        }
      }

      const res = await fetch(`/api/career-notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          metadata: Object.keys(filteredMetadata).length > 0 ? filteredMetadata : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.")
      }
      toast.success("커리어노트가 수정되었습니다.")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "수정에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>커리어노트 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="career-note-title">제목</Label>
            <Input
              id="career-note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="career-note-content">내용</Label>
            <Textarea
              id="career-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">메타데이터 (선택)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {METADATA_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`career-note-meta-${field.key}`} className="text-xs">
                    {field.label}
                  </Label>
                  <Input
                    id={`career-note-meta-${field.key}`}
                    value={metadata[field.key] ?? ""}
                    onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildMetadataState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any,
): Record<string, string> {
  const meta = metadata as Record<string, string | undefined> | null | undefined
  const state: Record<string, string> = {}
  for (const field of METADATA_FIELDS) {
    state[field.key] = meta?.[field.key] ?? ""
  }
  return state
}
