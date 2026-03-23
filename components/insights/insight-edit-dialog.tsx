"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { InsightCardData } from "./insight-card"

const CATEGORY_OPTIONS = [
  { value: "strength", label: "강점" },
  { value: "experience", label: "경험" },
  { value: "motivation", label: "동기" },
  { value: "skill", label: "기술" },
  { value: "other", label: "기타" },
] as const

interface InsightEditDialogProps {
  insight: InsightCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InsightEditDialog({
  insight,
  open,
  onOpenChange,
  onSuccess,
}: InsightEditDialogProps) {
  const [title, setTitle] = useState(insight?.title ?? "")
  const [content, setContent] = useState(insight?.content ?? "")
  const [category, setCategory] = useState(insight?.category ?? "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (insight) {
      setTitle(insight.title)
      setContent(insight.content)
      setCategory(insight.category)
    }
  }, [insight])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!insight) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "수정에 실패했습니다.")
      }
      toast.success("인사이트가 수정되었습니다.")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>인사이트 수정</DialogTitle>
          <DialogDescription>인사이트의 카테고리와 내용을 수정합니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insight-category">카테고리</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="insight-category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insight-title">제목</Label>
            <Input
              id="insight-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insight-content">내용</Label>
            <Textarea
              id="insight-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
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
